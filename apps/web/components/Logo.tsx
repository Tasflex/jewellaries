import { LOGO_HEIGHT, LOGO_INK, LOGO_MARK, LOGO_RED, LOGO_WIDTH } from "./logoPaths";

/**
 * The logo artwork is defined once per page as an SVG <symbol> (rendered in the
 * root layout) and reused by <Logo/>. Colours come from CSS variables, so the
 * same artwork is champagne-gold on dark and antique gold on light.
 */
export function LogoSymbol() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden focusable="false">
      <defs>
        <symbol id="jw-logo" viewBox={`0 0 ${LOGO_WIDTH} ${LOGO_HEIGHT}`}>
          <g dangerouslySetInnerHTML={{ __html: LOGO_MARK }} />
          <g style={{ fill: "var(--logo-ink)" }} dangerouslySetInnerHTML={{ __html: LOGO_INK }} />
          <g style={{ fill: "var(--logo-red)" }} dangerouslySetInnerHTML={{ __html: LOGO_RED }} />
        </symbol>
        <symbol id="jw-mark" viewBox="0 0 64 64">
          <g dangerouslySetInnerHTML={{ __html: LOGO_MARK }} />
        </symbol>
      </defs>
    </svg>
  );
}

export default function Logo({ height = 30, markOnly = false, className = "" }: { height?: number; markOnly?: boolean; className?: string }) {
  const w = markOnly ? height : Math.round((LOGO_WIDTH / LOGO_HEIGHT) * height);
  return (
    <svg className={`logo-svg ${className}`} width={w} height={height} viewBox={markOnly ? "0 0 64 64" : `0 0 ${LOGO_WIDTH} ${LOGO_HEIGHT}`} role="img" aria-label="Jewellariess">
      <use href={markOnly ? "#jw-mark" : "#jw-logo"} />
    </svg>
  );
}
