import { PieceGlyph } from "@/components/game/PieceGlyph";
import { DoodleArrow, DoodleNote, DoodleStar } from "@/components/doodle/Doodles";
import type { CellValue } from "@/game/types";

const PREVIEW: CellValue[] = ["red", null, "blue", null, "red", "blue", "red", "blue", null];

const PREVIEW_RADII = [
  "22% 18% 24% 19% / 19% 24% 18% 22%",
  "18% 23% 19% 22% / 23% 18% 22% 19%",
  "24% 19% 22% 18% / 18% 22% 19% 24%",
  "19% 22% 18% 23% / 22% 19% 24% 18%",
  "21% 20% 23% 19% / 20% 23% 19% 21%",
  "23% 18% 20% 22% / 19% 21% 23% 18%",
  "18% 24% 19% 21% / 24% 18% 21% 19%",
  "22% 19% 24% 18% / 18% 24% 19% 22%",
  "20% 22% 18% 23% / 23% 19% 21% 18%",
];

/** Decorative, non-interactive board used on the home and rules screens. */
export function BoardPreview({ className = "" }: { className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <DoodleNote className="absolute -top-7 left-0 text-x" rotate={-8}>
        YOUR MOVE!
      </DoodleNote>
      <DoodleArrow className="absolute -right-8 top-6 h-10 w-20 text-ink" />
      <DoodleStar className="animate-wiggle absolute -left-6 bottom-10 h-7 w-7 text-gold" />
      <DoodleNote className="absolute -bottom-8 right-2" rotate={4}>
        think.
      </DoodleNote>
      <div aria-hidden="true" className="board-frame sticker aspect-square p-[5%]">
        <div className="grid h-full w-full grid-cols-3 grid-rows-3 gap-[3%]">
          {PREVIEW.map((cell, i) => (
            <div key={i} className="relative p-[4%]">
              <div className="board-cell h-full w-full" style={{ borderRadius: PREVIEW_RADII[i] }} />
              {cell && (
                <div className="piece absolute inset-[13%]" data-idle="true" style={{ animationDelay: `${i * 0.2}s` }}>
                  <div className="piece-token flex h-full w-full items-center justify-center" data-color={cell} style={{ animationDelay: `${i * 0.25}s` }}>
                    <PieceGlyph player={cell} className="relative z-10 h-[46%] w-[46%]" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
