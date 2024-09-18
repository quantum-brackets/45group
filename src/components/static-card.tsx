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
  // console.log(typeof window !== "undefined" && window?.location?.origin);
  // const imageSources = images
  //   .map((image) =>
  //     typeof image === "string"
  //       ? `url('${image}')`
  //       : `url('${(typeof window !== "undefined" && window?.location?.origin) || ""}${image.src}')`
  //   )
  //   .join("|");

  return (
    <Link href={link} className="flex flex-col items-center gap-12 tablet_768:gap-8">
      <carousel-stack
        images="url('https://get.fohlio.com/hubfs/Imported_Blog_Media/The-Psychology-of-Hotel-Interior-Design-Part-3-Acoustics-Fohlio-Peninsula-Shanghai-1.jpg')|url('https://get.fohlio.com/hubfs/Imported_Blog_Media/The-Psychology-of-Hotel-Interior-Design-Part-3-Acoustics-Fohlio-St-Regis-Shenzen-1.jpg')|url('https://get.fohlio.com/hubfs/Imported_Blog_Media/The-Psychology-of-Hotel-Interior-Design-Part-3-Acoustics-Fohlio-sound-diffusion-1.jpg')|url('https://get.fohlio.com/hubfs/Imported_Blog_Media/The-Psychology-of-Hotel-Interior-Design-Part-3-Acoustics-Fohlio-Dubai-skyline-1.png')"
        id="carousel"
        style={{
          width: "200px",
          height: "120px",
          position: "relative",
        }}
        transition-secs={1}
        image-gap="40px"
        image-idx={0}
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
