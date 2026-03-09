export const withNotDeleted = <T extends Record<string, unknown>>(
  where: T = {} as T,
) => ({
  ...where,
  deletedAt: null,
});
