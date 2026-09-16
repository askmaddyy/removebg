import type { Metadata } from "next";

// The editor is a client component, so its metadata lives here. Without it the
// route inherits the landing page's title verbatim and the two compete.
export const metadata: Metadata = {
  title: "Editor — remove a background in your browser | removebg.fyi",
  description:
    "Drop an image and cut the background out on your own machine. Swap in a colour, gradient or blur, add a shadow, refine edges with a brush, then download at full resolution.",
  alternates: { canonical: "/app" },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return children;
}
