"use client";

import React, { useState, useEffect, useRef } from "react";
import Image, { StaticImageData } from "next/image";
import Link from "next/link";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { cn } from "~/utils/helpers";

type Props = {
  name: string;
  link: string;
  location: string;
  images: string[] | StaticImageData[];
};

export default function StaticCard({ name, location, images, link }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (images.length === 0) return;

    const preloadImages = async () => {
      const promises = (images as string[]).map((src) => {
        return new Promise<void>((resolve) => {
          const img = new window.Image();
          img.src = src;
          img.onload = () => resolve();
        });
      });
      await Promise.all(promises);
    };

    preloadImages();
  }, [images]);

  useEffect(() => {
    const interval = setInterval(() => {
      if ((isHovered || (isMobile && isInView)) && !isTransitioning) {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [images.length, isHovered, isMobile, isInView, isTransitioning]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
        if (entry.isIntersecting && isMobile) {
          controls.start({ opacity: 1, y: 0 });
        }
      },
      { threshold: 0.5 }
    );

    const currentCardRef = cardRef.current;

    if (currentCardRef) {
      observer.observe(currentCardRef);
    }

    return () => {
      if (currentCardRef) {
        observer.unobserve(currentCardRef);
      }
    };
  }, [isMobile, controls]);

  return (
    <Link href={link} className="flex flex-col items-center gap-12 tablet_768:gap-8">
      <motion.div
        ref={cardRef}
        className="relative aspect-video w-full"
        onHoverStart={() => !isMobile && setIsHovered(true)}
        onHoverEnd={() => !isMobile && setIsHovered(false)}
        initial={isMobile ? { opacity: 0, y: 50 } : {}}
        animate={controls}
      >
        <AnimatePresence initial={false}>
          {[0, 1, 2].map((offset) => {
            const index = (currentIndex + offset) % images.length;

            return (
              <motion.div
                key={index}
                className={cn(
                  "absolute h-full w-full overflow-hidden rounded-xl largeLaptop:rounded-2xl"
                )}
                style={{
                  opacity: offset === 0 ? 1 : offset === 1 ? 0.666667 : offset === 2 ? 0.333333 : 0,
                }}
                custom={offset}
                initial={{
                  bottom: `-${14 * offset}px`,
                  right: `-${14 * offset}px`,
                  zIndex: 3 - offset,
                }}
                animate={{
                  bottom: `-${14 * offset}px`,
                  right: `-${14 * offset}px`,
                  zIndex: 3 - offset,
                  y: [0, -5, 0],
                  transition: {
                    type: "tween",
                    delay: offset === 0 ? 0.2 : offset === 1 ? 0.4 : offset === 2 ? 0.6 : 0,
                    stiffness: 300,
                    damping: 10,
                    duration: 0.5,
                  },
                }}
                exit={{
                  bottom: `${14}px`,
                  right: `${14}px`,
                  opacity: "0%",
                  transition: {
                    duration: 0.5,
                  },
                }}
                transition={{
                  y: { type: "tween", stiffness: 300, damping: 30, duration: 0.5 },
                  opacity: { duration: 0.2 },
                }}
                onAnimationStart={() => setIsTransitioning(true)}
                onAnimationComplete={() => setIsTransitioning(false)}
              >
                <div className="relative h-full w-full">
                  <Image
                    src={images[index]}
                    alt={`${name} - Image ${index + 1}`}
                    className="absolute h-full w-full object-cover"
                    priority={true}
                    placeholder="blur"
                  />
                  <div
                    className="absolute top-0 z-[1] h-full w-full"
                    style={{
                      backgroundColor: `rgba(0, 0, 0, ${0.4 - offset * 0.1})`,
                    }}
                  />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>
      <div className="flex flex-col items-center gap-1">
        <h5 className="text-sm largeMobile:text-xs largeMobile:font-semibold largeLaptop:text-lg">
          {name}
        </h5>
        <small className="text-xs largeMobile:text-xs largeLaptop:text-base">{location}</small>
      </div>
    </Link>
  );
}
