"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
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
    caption: "Your offer, in plain words. No lawyer talk.",
  },
  {
    src: "/paid-report-video-run/2.png",
    alt: "What moves your number, and why.",
    title: "What lifts your range",
    caption: "What moves your number, and why.",
  },
  {
    src: "/paid-report-video-run/3.png",
    alt: "Every term in your letter, explained.",
    title: "Your terms explained",
    caption: "Every term in your letter, explained.",
  },
  {
    src: "/paid-report-video-run/4.png",
    alt: "Your dates in one place, so you don't miss one.",
    title: "Your timeline & deadlines",
    caption: "Your dates in one place, so you don't miss one.",
  },
  {
    src: "/paid-report-video-run/5.png",
    alt: "The exact questions to ask, before you sign.",
    title: "Questions to ask HR",
    caption: "The exact questions to ask, before you sign.",
  },
  {
    src: "/paid-report-video-run/6.png",
    alt: "$59, one time. And talking to a lawyer is still free.",
    title: "One-time $59 full report",
    caption: "$59, one time. And talking to a lawyer is still free.",
  },
];

const TOTAL_DURATION_SEC = 45;
const SLIDE_DURATION_MS = (TOTAL_DURATION_SEC * 1000) / REPORT_VIDEO_SLIDES.length; // 7500ms (7.5s per slide)

export default function ReportVideoPlayer({
  onOpenModal,
  autoPlay = false,
  isModal = false,
}: ReportVideoPlayerProps) {
  const [hasStarted, setHasStarted] = useState(autoPlay);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [progressMs, setProgressMs] = useState(0); // 0 to SLIDE_DURATION_MS
  const [showControls, setShowControls] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const lastTimeRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Preload slides for instant transitions
  useEffect(() => {
    REPORT_VIDEO_SLIDES.forEach((slide) => {
      const img = new window.Image();
      img.src = slide.src;
    });
  }, []);

  // Next / Prev slide handlers
  const goToNextSlide = useCallback(() => {
    setCurrentSlide((prev) => {
      if (prev >= REPORT_VIDEO_SLIDES.length - 1) {
        setIsPlaying(false);
        setIsCompleted(true);
        return prev;
      }
      setProgressMs(0);
      return prev + 1;
    });
  }, []);

  const goToPrevSlide = useCallback(() => {
    setCurrentSlide((prev) => {
      setProgressMs(0);
      setIsCompleted(false);
      return prev > 0 ? prev - 1 : 0;
    });
  }, []);

  const selectSlide = (index: number) => {
    setCurrentSlide(index);
    setProgressMs(0);
    setIsCompleted(false);
    setIsPlaying(true);
  };

  const handleStart = () => {
    setHasStarted(true);
    setIsPlaying(true);
    setIsCompleted(false);
    setProgressMs(0);
  };

  const togglePlayPause = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!hasStarted) {
      handleStart();
      return;
    }
    if (isCompleted) {
      setCurrentSlide(0);
      setProgressMs(0);
      setIsCompleted(false);
      setIsPlaying(true);
      return;
    }
    setIsPlaying((prev) => !prev);
  };

  const handleRestart = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentSlide(0);
    setProgressMs(0);
    setIsCompleted(false);
    setIsPlaying(true);
  };

  // Main playback loop
  useEffect(() => {
    if (!isPlaying || isCompleted) {
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
          goToNextSlide();
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
  }, [isPlaying, isCompleted, goToNextSlide]);

  // Controls auto-hide on mouse idle
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 2500);
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === " " || e.key === "k") {
      e.preventDefault();
      togglePlayPause();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      goToNextSlide();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      goToPrevSlide();
    }
  };

  // Calculate current total seconds
  const currentTotalSeconds = Math.min(
    TOTAL_DURATION_SEC,
    Math.floor((currentSlide * SLIDE_DURATION_MS + progressMs) / 1000)
  );
  const minutes = Math.floor(currentTotalSeconds / 60);
  const seconds = currentTotalSeconds % 60;
  const timeFormatted = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setShowControls(true)}
      className={`relative w-full aspect-[682/380] rounded-[14px] bg-[#062C55] overflow-hidden select-none outline-none group shadow-md transition-shadow hover:shadow-lg ${
        isModal ? "max-h-[70vh]" : "mb-7"
      }`}
      aria-label="What's in your report preview video"
      role="region"
    >
      {/* ── SLIDE IMAGE DISPLAY ── */}
      <div className="absolute inset-0 bg-[#062C55]">
        {REPORT_VIDEO_SLIDES.map((slide, idx) => (
          <div
            key={slide.src}
            className={`absolute inset-0 transition-opacity duration-300 ease-in-out ${
              idx === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
            }`}
          >
            <Image
              src={slide.src}
              alt={slide.alt}
              fill
              sizes="(max-width: 768px) 100vw, 700px"
              priority={idx === 0}
              className="object-contain object-center"
            />
          </div>
        ))}
      </div>

      {/* ── TOP SEGMENTED PROGRESS BAR ── */}
      {hasStarted && (
        <div
          className={`absolute top-0 inset-x-0 z-30 p-2.5 sm:p-3 bg-gradient-to-b from-black/60 to-transparent transition-opacity duration-300 ${
            showControls || !isPlaying ? "opacity-100" : "opacity-85"
          }`}
        >
          <div className="flex items-center gap-1.5 w-full">
            {REPORT_VIDEO_SLIDES.map((_, idx) => {
              let fillPercent = 0;
              if (idx < currentSlide) {
                fillPercent = 100;
              } else if (idx === currentSlide) {
                fillPercent = isCompleted ? 100 : Math.min(100, (progressMs / SLIDE_DURATION_MS) * 100);
              } else {
                fillPercent = 0;
              }

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    selectSlide(idx);
                  }}
                  className="flex-1 h-[3.5px] sm:h-[4px] rounded-full bg-white/30 overflow-hidden cursor-pointer hover:h-[5px] transition-all relative"
                  title={`Go to part ${idx + 1}: ${REPORT_VIDEO_SLIDES[idx].title}`}
                  aria-label={`Go to slide ${idx + 1}`}
                >
                  <div
                    className="h-full bg-white rounded-full transition-all duration-75"
                    style={{ width: `${fillPercent}%` }}
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TOUCH / CLICK TAP ZONES (Left = Prev, Right = Next, Center = Toggle) ── */}
      {hasStarted && !isCompleted && (
        <div className="absolute inset-0 z-20 flex">
          <div
            className="w-1/4 h-full cursor-pointer"
            onClick={goToPrevSlide}
            title="Previous (or press left arrow)"
          />
          <div
            className="w-2/4 h-full cursor-pointer flex items-center justify-center"
            onClick={togglePlayPause}
            title={isPlaying ? "Pause" : "Play"}
          >
            {/* Center Pause Indicator on Pause */}
            {!isPlaying && (
              <div className="w-[62px] h-[62px] rounded-full bg-black/60 backdrop-blur-sm border border-white/40 flex items-center justify-center text-white shadow-xl animate-fade">
                <div className="w-0 h-0 border-y-[11px] border-y-transparent border-l-[18px] border-l-white ml-1" />
              </div>
            )}
          </div>
          <div
            className="w-1/4 h-full cursor-pointer"
            onClick={goToNextSlide}
            title="Next (or press right arrow)"
          />
        </div>
      )}

      {/* ── BOTTOM CONTROL BAR OVERLAY (Appears on hover or when paused) ── */}
      {hasStarted && !isCompleted && (
        <div
          className={`absolute bottom-0 inset-x-0 z-30 px-3 py-2.5 sm:px-4 sm:py-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-between transition-opacity duration-300 ${
            showControls || !isPlaying ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          {/* Left: Play/Pause button + Slide & Time info */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={togglePlayPause}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-xs flex items-center justify-center text-white transition cursor-pointer"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <span className="flex gap-[3px]">
                  <span className="w-[3px] h-3 bg-white rounded-xs" />
                  <span className="w-[3px] h-3 bg-white rounded-xs" />
                </span>
              ) : (
                <div className="w-0 h-0 border-y-[5px] border-y-transparent border-l-[9px] border-l-white ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={handleRestart}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition cursor-pointer text-xs"
              title="Restart from beginning"
              aria-label="Restart"
            >
              ↺
            </button>

            <div className="font-sans text-[11px] sm:text-[12px] font-medium text-white/90 drop-shadow-xs flex items-center gap-1.5">
              <span>{timeFormatted}</span>
              <span className="text-white/40">/</span>
              <span className="text-white/70">0:45</span>
              <span className="hidden sm:inline-block ml-1 text-white/40">·</span>
              <span className="hidden sm:inline-block text-white/70">
                {currentSlide + 1} of {REPORT_VIDEO_SLIDES.length}
              </span>
            </div>
          </div>

          {/* Right: Expand to Modal (if not already in modal) */}
          <div className="flex items-center gap-2">
            {onOpenModal && !isModal && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenModal();
                }}
                className="px-2.5 py-1 rounded-[6px] bg-white/15 hover:bg-white/25 text-white text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                title="Expand video"
              >
                <span>Expand</span>
                <span className="text-[12px]">⤢</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── END OF VIDEO OVERLAY (REPLAY & UNLOCK) ── */}
      {isCompleted && (
        <div className="absolute inset-0 z-40 bg-[#062C55]/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-fade">
          <div className="w-12 h-12 rounded-full bg-[#0EB28D]/20 border border-[#0EB28D]/40 flex items-center justify-center text-[#12C79A] text-xl font-bold mb-3">
            ✓
          </div>
          <h4 className="font-serif font-[600] text-[20px] sm:text-[22px] text-white mb-1.5">
            That&apos;s what&apos;s inside your report
          </h4>
          <p className="font-sans text-[12.5px] sm:text-[13px] text-white/80 max-w-[340px] mb-4">
            Custom-compiled from your severance letter and contract in seconds.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleRestart}
              className="px-4 py-2 rounded-[9px] bg-white/15 hover:bg-white/25 text-white font-sans font-[700] text-[13px] transition cursor-pointer flex items-center gap-1.5"
            >
              <span>↺</span>
              <span>Replay 45 sec</span>
            </button>
          </div>
        </div>
      )}

      {/* ── INITIAL TEASER / COVER OVERLAY (Before starting, matches Figma spec & user screenshot) ── */}
      {!hasStarted && (
        <div
          onClick={handleStart}
          className="absolute inset-0 z-40 bg-[#062C55]/75 backdrop-blur-[6px] flex flex-col items-center justify-center p-4 cursor-pointer transition-all hover:bg-[#062C55]/70"
        >
          {/* Play Button Icon */}
          <div className="w-[58px] h-[58px] rounded-full bg-white/20 border border-white/40 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg mb-3">
            <div className="w-0 h-0 border-y-[10px] border-y-transparent border-l-[17px] border-l-white ml-1" />
          </div>

          <span className="font-sans font-[800] text-[14px] text-white tracking-wide drop-shadow-sm text-center">
            What&apos;s in your report · 45 sec
          </span>
        </div>
      )}
    </div>
  );
}

