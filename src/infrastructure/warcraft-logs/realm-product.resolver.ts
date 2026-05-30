const REALM_PRODUCTS = {
  spineshatter: "fresh",
  "living-flame": "sod",
  "lone-wolf": "sod",
} as const;

export class UnsupportedRealmError extends Error {
  public constructor(realmSlug: string) {
    super(`Unsupported realm slug: ${realmSlug}`);
    this.name = "UnsupportedRealmError";
  }
}

export class RealmProductResolver {
  public resolve(realmSlug: string): string {
    const product = REALM_PRODUCTS[realmSlug as keyof typeof REALM_PRODUCTS];

    if (!product) {
      throw new UnsupportedRealmError(realmSlug);
    }

    return product;
  }
}
