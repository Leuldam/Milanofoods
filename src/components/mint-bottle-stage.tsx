"use client";

import Image from "next/image";
import { useState, type CSSProperties, type PointerEvent } from "react";

export function MintBottleStage() {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse") return;

    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;

    setTilt({
      x: Number((-y * 9).toFixed(2)),
      y: Number((x * 11).toFixed(2)),
    });
  }

  const bottleStyle: CSSProperties & {
    "--bottle-rotate-x": string;
    "--bottle-rotate-y": string;
  } = {
    "--bottle-rotate-x": `${tilt.x}deg`,
    "--bottle-rotate-y": `${tilt.y}deg`,
  };

  return (
    <div
      className="mint-stage"
      onPointerMove={handlePointerMove}
      onPointerLeave={() => setTilt({ x: 0, y: 0 })}
      style={bottleStyle}
      role="img"
      aria-label="Milano Mint syrup, a bright green 750 ml bottle"
    >
      <div className="mint-stage-glow" aria-hidden="true" />
      <div className="mint-stage-orbit mint-stage-orbit-outer" aria-hidden="true" />
      <div className="mint-stage-orbit mint-stage-orbit-inner" aria-hidden="true" />
      <div className="mint-stage-sparkle mint-stage-sparkle-one" aria-hidden="true" />
      <div className="mint-stage-sparkle mint-stage-sparkle-two" aria-hidden="true" />
      <div className="mint-bottle-shell">
        <Image
          src="/images/milano-mint-bottle-cutout.png"
          alt=""
          fill
          priority
          sizes="(max-width: 720px) 68vw, (max-width: 1100px) 39vw, 460px"
          className="mint-bottle-art"
        />
      </div>
      <div className="mint-stage-note" aria-hidden="true">
        <span className="mint-stage-note-dot" />
        COOL · HERBAL · BRIGHT
      </div>
      <div className="mint-stage-seal" aria-hidden="true">
        <span>THE</span>
        <strong>MINT</strong>
        <span>MOMENT</span>
      </div>
    </div>
  );
}
