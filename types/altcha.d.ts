import * as React from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "altcha-widget": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          name?: string;
          challengeurl?: string;
          auto?: string;
          overlay?: boolean | string;
          workers?: number | string;
          expire?: number | string;
          debug?: boolean | string;
          [key: string]: any;
        },
        HTMLElement
      >;
    }
  }
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "altcha-widget": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          name?: string;
          challengeurl?: string;
          auto?: string;
          overlay?: boolean | string;
          workers?: number | string;
          expire?: number | string;
          debug?: boolean | string;
          [key: string]: any;
        },
        HTMLElement
      >;
    }
  }
}
