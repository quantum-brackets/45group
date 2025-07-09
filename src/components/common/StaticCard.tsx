
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
  images: string[] | StaticImageData[];
};

export default function StaticCard({ name, images, link }: Props) {
  const [imageIdx, setImageIdx] = useState(0);
  const imageSources = useMemo(() => {
    return images
      .map((image) => {
        return typeof image === "string" ? `url('${image}')` : `url('${image.src}')`;
      })
      .join("|");
  }, [images]);

  const carouselRef = useRef<CarouselStackElement | null>(null);

  // Set up the auto-play timer for the carousel
  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setTimeout(() => {
      setImageIdx((prev) => (prev + 1) % images.length);
    }, 3000);
    return () => clearTimeout(timer);
  }, [imageIdx, images.length]);

  // Manually set attributes on the custom element to avoid React property conflicts
  useEffect(() => {
    if (carouselRef.current) {
      carouselRef.current.setAttribute('images', imageSources);
      
      const shadowRoot = carouselRef.current.shadowRoot;
      if (shadowRoot && !shadowRoot.querySelector('style')) {
        const style = document.createElement("style");
        style.textContent = `
          div {
            width: 100%;
            aspect-ratio: 16 / 9;
            border: solid 2px #2aa1471a;
            border-radius: 0.75rem;
            object-fit: cover;
            background-position: center;
            background-size: cover;
            filter: brightness(1.0);
          }`;
        shadowRoot.appendChild(style);
      }
    }
  }, [imageSources]);

  return (
    <Link 
      href={link} 
      className="flex flex-col items-center gap-12 tablet_768:gap-8"
      aria-label={`Explore our ${name} services, a part of our premier hospitality offerings.`}
    >
      <carousel-stack
        ref={carouselRef}
        id="carousel"
        style={{
          width: "100%",
          aspectRatio: 16 / 9,
          position: "relative",
        }}
        image-gap="10px"
        image-idx={imageIdx}
        transition-secs="1"
      />
      <div className="flex flex-col items-center gap-1">
        <h5 className="font-bold text-sm largeMobile:text-xs largeMobile:font-semibold largeLaptop:text-lg">
          {name}
        </h5>
      </div>
    </Link>
  );
}
