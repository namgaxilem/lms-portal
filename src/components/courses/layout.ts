/**
 * Course grid columns follow the width of the grid's own container (wrap it in
 * `@container`), so the same grid fits a full page and a dashboard column:
 * two columns from 448px (a dashboard column on a 1024px laptop is ~456px),
 * three from 896px.
 */
export const GRID_CLASS = "grid grid-cols-1 gap-5 @md:grid-cols-2 @4xl:grid-cols-3";

export const LIST_CLASS = "flex flex-col gap-3";
