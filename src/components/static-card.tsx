"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Image, { StaticImageData } from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  name: string;
  link: string;
  location: string;
  images: string[] | StaticImageData[];
};

export default function StaticCard({ name, location, images, link }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const nextIndex = useCallback(
    (index: number) => {
      return (index + 1) % images.length;
    },
    [images.length]
  );

  useEffect(() => {
    if (isHovered) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prevIndex) => nextIndex(prevIndex));
      }, 2000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isHovered, images.length, nextIndex]);

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
    }),
  };

  function startHover() {
    setIsHovered(true);
  }

  function endHover() {
    setIsHovered(false);
  }

  return (
    <Link href={link} className="flex flex-col items-center gap-12 tablet_768:gap-8">
      <figure className="relative aspect-video w-full">
        <motion.div
          className="relative h-full w-full overflow-hidden rounded-xl largeLaptop:rounded-2xl"
          onHoverStart={startHover}
          onHoverEnd={endHover}
          onDragStart={startHover}
          onDragEnd={endHover}
        >
          <AnimatePresence initial={false} custom={1}>
            <motion.div
              key={currentIndex}
              custom={1}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
              }}
              className="absolute h-full w-full"
            >
              <Image
                src={images[currentIndex]}
                alt={`${name} - Image ${currentIndex + 1}`}
                className="h-full w-full object-cover"
              />
            </motion.div>
          </AnimatePresence>
          <div
            className="absolute top-0 h-full w-full bg-black/40"
            style={{ zIndex: images.length + 2 }}
          />
        </motion.div>
        <div className="absolute -bottom-[14px] -right-[14px] -z-[1] h-full w-full rounded-xl bg-black/25 tablet_768:!-bottom-2.5 tablet_768:!-right-2.5 largeLaptop:rounded-xl" />
        <div className="absolute -bottom-[28px] -right-[28px] -z-[2] h-full w-full rounded-xl bg-black/15 tablet_768:!-bottom-5 tablet_768:!-right-5 largeLaptop:rounded-xl" />
      </figure>
      <div className="flex flex-col items-center gap-1">
        <h5 className="text-sm largeMobile:text-xs largeMobile:font-semibold largeLaptop:text-lg">
          {name}
        </h5>
        <small className="text-xs largeMobile:text-xs largeLaptop:text-base">{location}</small>
      </div>
    </Link>
  );
}
