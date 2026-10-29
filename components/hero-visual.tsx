import { HostoraScene } from "@/components/hostora-scene";
import { BrandFilmDialog } from "@/components/brand-film-dialog";
export function HeroVisual() {
  return (
    <div className="commerce-hero-visual hostora-art-stage">
      <div className="hostora-stage-label">
        <span>H / KHỞI ĐẦU</span>
        <span>01 — HOSTORA</span>
      </div>
      <HostoraScene />
      <div className="hostora-stage-footer">
        <span>
          Một ý tưởng nhỏ.
          <br />
          <strong>Một thế giới của riêng bạn.</strong>
        </span>
        <BrandFilmDialog />
      </div>
    </div>
  );
}
