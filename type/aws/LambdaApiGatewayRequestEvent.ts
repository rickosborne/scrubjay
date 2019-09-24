export interface LambdaApiGatewayRequestEvent {
  headers?: {
    [key: string]: string;
  };
  httpMethod: string;
  multiValueHeaders?: {
    [key: string]: string[];
  };
  path: string;
  pathParameters: {
    [key: string]: string;
  };
}

