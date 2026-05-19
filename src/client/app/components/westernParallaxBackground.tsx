import type { CSSProperties, ReactNode } from "react";

const cloudsImagePath = "/clouds5.png";
const distantMountainImagePath = "/distant_mountain3.png";
const hillsAndCactiImagePath = "/hills_and_cacti.png";
const foregroundImagePath = "/Foreground_layer.png";

interface WesternParallaxBackgroundProps {
  children: ReactNode;
}

interface WesternParallaxStyle extends CSSProperties {
  "--western-clouds-image": string;
  "--western-distant-mountain-image": string;
  "--western-hills-and-cacti-image": string;
  "--western-foreground-image": string;
}

export function WesternParallaxBackground({
  children,
}: WesternParallaxBackgroundProps): React.JSX.Element {
  const backgroundStyle: WesternParallaxStyle = {
    "--western-clouds-image": `url("${cloudsImagePath}")`,
    "--western-distant-mountain-image": `url("${distantMountainImagePath}")`,
    "--western-hills-and-cacti-image": `url("${hillsAndCactiImagePath}")`,
    "--western-foreground-image": `url("${foregroundImagePath}")`,
  };

  return (
    <div className="western-parallax-background" style={backgroundStyle}>
      <div className="western-parallax-layers" aria-hidden="true">
        <div className="western-parallax-layer western-parallax-sky" />
        <div className="western-parallax-layer western-parallax-mountains" />
        <div className="western-parallax-layer western-parallax-hills" />
        <div className="western-parallax-layer western-parallax-foreground" />
      </div>
      <div className="western-parallax-content">{children}</div>
    </div>
  );
}
