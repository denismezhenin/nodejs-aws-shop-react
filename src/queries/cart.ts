import axios, { AxiosError } from "axios";
import React from "react";
import { useQuery, useQueryClient, useMutation } from "react-query";
import API_PATHS from "~/constants/apiPaths";
import { CartItem } from "~/models/CartItem";
import { AvailableProduct, Product } from "~/models/Product";

type ServerCartItem = {
  cartId?: string;
  productId: string;
  count: number;
};

const PRODUCTS_KEY = "available-products";

function isHydrated(item: ServerCartItem | CartItem): item is CartItem {
  return "product" in item && !!item.product;
}

export function useCart() {
  const queryClient = useQueryClient();

  return useQuery<CartItem[], AxiosError>("cart", async () => {
    const res = await axios.get<(ServerCartItem | CartItem)[]>(
      `${API_PATHS.cart}/profile/cart`,
      {
        headers: {
          Authorization: `Basic ${localStorage.getItem("authorization_token")}`,
        },
      }
    );

    const rows = res.data ?? [];
    if (rows.length === 0) return [];

    // Hydrate each line with full product data (title/price/description) from
    // the catalog, reusing the product list's cache when it's already loaded.
    const products: AvailableProduct[] =
      queryClient.getQueryData<AvailableProduct[]>(PRODUCTS_KEY) ??
      (await queryClient.fetchQuery<AvailableProduct[]>(
        PRODUCTS_KEY,
        async () => {
          const r = await axios.get<AvailableProduct[]>(
            `${API_PATHS.product}/products`
          );
          return r.data;
        }
      ));
    const byId = new Map(
      products.map((p: AvailableProduct) => [p.id, p] as const)
    );

    return rows.map<CartItem>((item: ServerCartItem | CartItem) => {
      if (isHydrated(item)) return item;
      const product: Product = byId.get(item.productId) ?? {
        id: item.productId,
        title: "Unknown product",
        description: "",
        price: 0,
      };
      return { product, count: item.count };
    });
  });
}

export function useCartData() {
  const queryClient = useQueryClient();
  return queryClient.getQueryData<CartItem[]>("cart");
}

export function useInvalidateCart() {
  const queryClient = useQueryClient();
  return React.useCallback(
    () => queryClient.invalidateQueries("cart", { exact: true }),
    []
  );
}

export function useUpsertCart() {
  return useMutation((values: CartItem) =>
    axios.put<ServerCartItem[]>(`${API_PATHS.cart}/profile/cart`, values, {
      headers: {
        Authorization: `Basic ${localStorage.getItem("authorization_token")}`,
      },
    })
  );
}
