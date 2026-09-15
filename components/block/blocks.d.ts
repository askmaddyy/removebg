import type { ReactNode, CSSProperties } from "react";

declare module "@/components/block/text-stream" {
  export function TextStream(props: {
    items?: string[];
    highlight?: string;
    prefix?: string;
    fontSize?: string;
    fontWeight?: number;
    height?: string | number;
    paused?: boolean;
    className?: string;
    style?: CSSProperties;
    scroller?: unknown;
  }): ReactNode;
}

declare module "@/components/block/text-fill-animation" {
  export function TextFillAnimation(props: {
    text?: string;
    textColor?: string;
    primaryColor?: string;
    dimColor?: string;
    backgroundColor?: string;
    className?: string;
    id?: string;
    textSize?: string;
    textWidth?: string;
    containerClassName?: string;
    mobileTextSize?: string;
    mobileTextWidth?: string;
    tabletTextSize?: string;
    tabletTextWidth?: string;
    scroller?: unknown;
    trigger?: unknown;
    start?: string;
    end?: string;
    scrub?: number | boolean;
    height?: string | number;
    viewportHeight?: string;
    showDetails?: boolean;
    style?: CSSProperties;
  }): ReactNode;
}
