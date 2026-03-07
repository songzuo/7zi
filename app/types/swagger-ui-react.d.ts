declare module 'swagger-ui-react' {
  import { ComponentType } from 'react';

  interface SwaggerUIProps {
    url?: string;
    spec?: object;
    deepLinking?: boolean;
    displayOperationId?: boolean;
    defaultModelsExpandDepth?: number;
    defaultModelExpandDepth?: number;
    displayRequestDuration?: boolean;
    docExpansion?: 'list' | 'full' | 'none';
    filter?: boolean | string;
    layout?: string;
    showExtensions?: boolean;
    showCommonExtensions?: boolean;
    syntaxHighlight?: boolean | object;
    tryItOutEnabled?: boolean;
    requestSnippetsEnabled?: boolean;
    requestSnippets?: object;
    oauth2RedirectUrl?: string;
    requestInterceptor?: (request: object) => object;
    responseInterceptor?: (response: object) => object;
    supportedSubmitMethods?: string[];
    validatorUrl?: string | null;
    withCredentials?: boolean;
    presets?: object[];
    plugins?: object[];
    theme?: 'light' | 'dark';
  }

  const SwaggerUI: ComponentType<SwaggerUIProps>;
  export default SwaggerUI;
}

declare module 'swagger-ui-react/swagger-ui.css' {
  const content: string;
  export default content;
}