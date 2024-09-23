"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { StaticImageData } from "next/image";
import Link from "next/link";

interface CarouselStackElement extends HTMLElement {
  shadowRoot: ShadowRoot | null;
}

type Props = {
  name: string;
  link: string;
  location: string;
  images: string[] | StaticImageData[];
};

export default function StaticCard({ name, location, images, link }: Props) {
  const [imageIdx, setImageIdx] = useState(0);
  const imageSources = useMemo(() => {
    return images
      .map((image) => {
        return typeof image === "string" ? `url('${image}')` : `url('${image.src}')`;
      })
      .join("|");
  }, [images]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setImageIdx((prev) => (prev + 1) % 4);
    }, 3000);

    return () => clearTimeout(timeoutId);
  }, [imageIdx]);

  const carouselRef = useRef<CarouselStackElement | null>(null);

  useEffect(() => {
    if (carouselRef.current) {
      const shadowRoot = carouselRef.current.shadowRoot;
      if (shadowRoot) {
        const style = document.createElement("style");
        style.textContent = `
          div {
            width: 100%;
            aspect-ratio: 16 / 9;
            border-radius: 0.75rem;
            object-fit: cover;
            background-position: center;
            background-size: cover;
            filter: brightness(0.6);
            }
            `;
        shadowRoot.appendChild(style);
      }
    }
  }, []);

  return (
    <Link href={link} className="flex flex-col items-center gap-12 tablet_768:gap-8">
      <carousel-stack
        images={imageSources}
        ref={carouselRef}
        id="carousel"
        style={{
          width: "100%",
          aspectRatio: 16 / 9,
          position: "relative",
        }}
        image-gap="10px"
        image-idx={imageIdx}
      />
      <div className="flex flex-col items-center gap-1">
        <h5 className="text-sm largeMobile:text-xs largeMobile:font-semibold largeLaptop:text-lg">
          {name}
        </h5>
        <small className="text-xs largeMobile:text-xs largeLaptop:text-base">{location}</small>
      </div>
    </Link>
  );
}
