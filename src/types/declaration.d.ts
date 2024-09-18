declare namespace JSX {
  interface IntrinsicElements {
    "carousel-stack": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      images?: string;
      "image-gap"?: string;
      "image-idx"?: number;
    };
  }
}
