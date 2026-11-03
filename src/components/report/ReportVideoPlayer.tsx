"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";

export interface ReportVideoPlayerProps {
  onOpenModal?: () => void;
  autoPlay?: boolean;
  isModal?: boolean;
}

export const REPORT_VIDEO_SLIDES = [
  {
    src: "/paid-report-video-run/1.png",
    alt: "Your offer, in plain words. No lawyer talk.",
    title: "Your offer, in plain words",
  },
  {
    src: "/paid-report-video-run/2.png",
    alt: "What moves your number, and why.",
    title: "What lifts your range",
  },
  {
    src: "/paid-report-video-run/3.png",
    alt: "Every term in your letter, explained.",
    title: "Your terms explained",
  },
  {
    src: "/paid-report-video-run/4.png",
    alt: "Your dates in one place, so you don't miss one.",
    title: "Your timeline & deadlines",
  },
  {
    src: "/paid-report-video-run/5.png",
    alt: "The exact questions to ask, before you sign.",
    title: "Questions to ask HR",
  },
  {
    src: "/paid-report-video-run/6.png",
    alt: "$59, one time. And talking to a lawyer is still free.",
    title: "One-time $59 full report",
  },
];

// Total 45 seconds across all 6 slides (7.5 seconds per slide)
const TOTAL_DURATION_SEC = 45;
const SLIDE_COUNT = REPORT_VIDEO_SLIDES.length;
const SLIDE_DURATION_MS = (TOTAL_DURATION_SEC * 1000) / SLIDE_COUNT; // 7500ms

export default function ReportVideoPlayer({
  autoPlay = false,
  isModal = false,
}: ReportVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [progressMs, setProgressMs] = useState(0);

  const lastTimeRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Preload slides for instant transitions
  useEffect(() => {
    REPORT_VIDEO_SLIDES.forEach((slide) => {
      const img = new window.Image();
      img.src = slide.src;
    });
  }, []);

  const handleStartPlay = () => {
    setCurrentSlide(0);
    setProgressMs(0);
    lastTimeRef.current = null;
    setIsPlaying(true);
  };

  // Play uninterrupted for exactly 45 seconds (no pause, no next, no prev)
  useEffect(() => {
    if (!isPlaying) {
      lastTimeRef.current = null;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const step = (timestamp: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = timestamp;
      }
      const delta = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      setProgressMs((prev) => {
        const next = prev + delta;
        if (next >= SLIDE_DURATION_MS) {
          setCurrentSlide((cur) => {
            if (cur >= SLIDE_COUNT - 1) {
              // 45 seconds finished! Return to idle state showing only play button
              setIsPlaying(false);
              return 0;
            }
            return cur + 1;
          });
          return 0;
        }
        return next;
      });

      animFrameRef.current = requestAnimationFrame(step);
    };

    animFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying]);

  return (
    <div
      className={`relative w-full aspect-[16/9] rounded-[14px] bg-[#062C55] overflow-hidden select-none outline-none shadow-md ${
        isModal ? "max-h-[70vh]" : "mb-7"
      }`}
      aria-label="What's in your report preview"
    >
      {/* ── SLIDE IMAGE DISPLAY ── */}
      <div className="absolute inset-0 bg-[#062C55]">
        {REPORT_VIDEO_SLIDES.map((slide, idx) => (
          <div
            key={slide.src}
            className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${
              idx === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
            }`}
          >
            <Image
              src={slide.src}
              alt={slide.alt}
              fill
              sizes="(max-width: 768px) 100vw, 800px"
              priority={idx === 0}
              className="object-contain object-center"
            />
          </div>
        ))}
      </div>

      {/* ── TOP SEGMENTED PROGRESS BAR (Only visible while playing, purely visual — no skip) ── */}
      {isPlaying && (
        <div className="absolute top-0 inset-x-0 z-30 p-2.5 sm:p-3 bg-gradient-to-b from-black/55 to-transparent pointer-events-none">
          <div className="flex items-center gap-1.5 w-full">
            {REPORT_VIDEO_SLIDES.map((_, idx) => {
              let fillPercent = 0;
              if (idx < currentSlide) {
                fillPercent = 100;
              } else if (idx === currentSlide) {
                fillPercent = Math.min(100, (progressMs / SLIDE_DURATION_MS) * 100);
              } else {
                fillPercent = 0;
              }

              return (
                <div
                  key={idx}
                  className="flex-1 h-[3.5px] sm:h-[4px] rounded-full bg-white/25 overflow-hidden"
                >
                  <div
                    className="h-full bg-white rounded-full transition-all duration-75"
                    style={{ width: `${fillPercent}%` }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── SUBTLE BOTTOM TITLE PILL (Only while playing, purely visual) ── */}
      {isPlaying && (
        <div className="absolute bottom-2.5 sm:bottom-3 left-3 sm:left-4 z-30 pointer-events-none">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 text-white font-sans text-[11px] sm:text-[12px] font-medium tracking-wide">
            <span className="text-[#0EB28D] font-bold">
              {currentSlide + 1} / {SLIDE_COUNT}
            </span>
            <span className="text-white/40">·</span>
            <span>{REPORT_VIDEO_SLIDES[currentSlide].title}</span>
          </div>
        </div>
      )}

      {/* ── INITIALLY & AFTER 45 SEC: ONLY SHOW PLAY BUTTON ── */}
      {!isPlaying && (
        <div
          onClick={handleStartPlay}
          className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-[#062C55]/65 backdrop-blur-[2px] cursor-pointer group transition-all"
        >
          <button
            type="button"
            onClick={handleStartPlay}
            aria-label="Play 45-second preview"
            className="flex flex-col items-center gap-3 cursor-pointer group focus:outline-none"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#062C55]/80 hover:bg-[#062C55] border-2 border-white/40 flex items-center justify-center text-white shadow-[0_10px_30px_rgba(0,0,0,0.4)] transition-all duration-200 group-hover:scale-105 group-hover:border-white">
              <svg
                className="w-7 h-7 sm:w-8 sm:h-8 fill-white translate-x-0.5"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <span className="text-white font-sans font-[700] text-[14px] sm:text-[15px] tracking-[0.2px] drop-shadow-md">
              What&apos;s in your report · 45 sec
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
