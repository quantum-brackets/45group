"use client";

import React from "react";
import { StaticImageData } from "next/image";
import Link from "next/link";

type Props = {
  name: string;
  link: string;
  location: string;
  images: string[] | StaticImageData[];
};

export default function StaticCard({ name, location, images, link }: Props) {
  const imageSources = images
    .map((image) => (typeof image === "string" ? `url('${image}')` : `url('${image.src}')`))
    .join("|");

  return (
    <Link href={link} className="flex flex-col items-center gap-12 tablet_768:gap-8">
      <carousel-stack
        images={imageSources}
        style={{
          width: "200px",
          height: "120px",
          display: "block",
        }}
        image-gap="40px"
        image-idx={0}
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
