"use client";

import React, { useEffect, useState } from "react";
import { StaticImageData } from "next/image";
import Link from "next/link";

type Props = {
  name: string;
  link: string;
  location: string;
  images: string[] | StaticImageData[];
};

export default function StaticCard({ name, location, images, link }: Props) {
  const [imageIdx, setImageIdx] = useState(0);
  const imageSources = images
    .map((image) =>
      typeof image === "string"
        ? `url('${image}')`
        : `url('${(typeof window !== "undefined" && window?.location?.origin) || ""}${image.src}')`
    )
    .join("|");

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setImageIdx((prev) => (prev + 1) % 4);
    }, 3000);

    return () => clearTimeout(timeoutId);
  }, [imageIdx]);

  return (
    <Link href={link} className="flex flex-col items-center gap-12 tablet_768:gap-8">
      <carousel-stack
        images={imageSources}
        id="carousel"
        style={{
          width: "100%",
          height: "200px",
          position: "relative",
          borderRadius: "12px",
        }}
        className="h-[200px] w-full rounded-xl !object-contain !brightness-50"
        image-gap="10px"
        image-idx={imageIdx}
        style-transfer="background-size|border-radius|height|width|border"
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
