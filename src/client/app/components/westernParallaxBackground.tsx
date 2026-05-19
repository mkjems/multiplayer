import type { CSSProperties, ReactNode } from "react";

const cloudsImagePath = "/clouds.png";

interface WesternParallaxBackgroundProps {
  children: ReactNode;
}

interface WesternParallaxStyle extends CSSProperties {
  "--western-clouds-image": string;
}

export function WesternParallaxBackground({
  children,
}: WesternParallaxBackgroundProps): React.JSX.Element {
  const backgroundStyle: WesternParallaxStyle = {
    "--western-clouds-image": `url("${cloudsImagePath}")`,
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
