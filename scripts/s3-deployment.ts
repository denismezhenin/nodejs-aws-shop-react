import * as path from "node:path";
import {
  App,
  CfnOutput,
  Stack,
  StackProps,
  aws_cloudfront as cloudfront,
  aws_cloudfront_origins as origins,
  aws_s3 as s3,
  aws_s3_deployment as s3deploy,
} from "aws-cdk-lib";
import { Construct } from "constructs";

class ReactApp extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const bucket = new s3.Bucket(this, "ReactAppBucket", {
      bucketName: `nodejs-aws-shop-react-${this.account}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      websiteIndexDocument: "index.html",
    });

    const originAccessIdentity = new cloudfront.OriginAccessIdentity(
      this,
      "ReactAppOAI"
    );

    bucket.grantRead(originAccessIdentity);

    const distribution = new cloudfront.Distribution(
      this,
      "ReactAppDistribution",
      {
        defaultRootObject: "index.html",
        defaultBehavior: {
          origin: origins.S3BucketOrigin.withOriginAccessIdentity(bucket, {
            originAccessIdentity,
          }),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
        errorResponses: [
          {
            httpStatus: 403,
            responseHttpStatus: 200,
            responsePagePath: "/index.html",
          },
          {
            httpStatus: 404,
            responseHttpStatus: 200,
            responsePagePath: "/index.html",
          },
        ],
      }
    );

    new s3deploy.BucketDeployment(this, "ReactAppDeployment", {
      sources: [s3deploy.Source.asset(path.join(__dirname, "..", "dist"))],
      destinationBucket: bucket,
      distribution,
      distributionPaths: ["/*"],
    });

    new CfnOutput(this, "DistributionDomainName", {
      value: distribution.distributionDomainName,
    });

    new CfnOutput(this, "BucketName", {
      value: bucket.bucketName,
    });
  }
}

const app = new App();
try {
  new ReactApp(app, "ReactAppStack", {
    env: {
      region: "eu-central-1",
    },
  });
} catch (e) {
  console.log(e);
}
