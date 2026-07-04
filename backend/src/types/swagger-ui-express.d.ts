declare module "swagger-ui-express" {
  import type { RequestHandler } from "express";

  interface SwaggerUIOptions {
    customSiteTitle?: string;
    customCss?: string;
  }

  interface SwaggerUI {
    serve: RequestHandler[];
    setup(spec: unknown, options?: SwaggerUIOptions): RequestHandler;
  }

  const swaggerUi: SwaggerUI;
  export default swaggerUi;
}
