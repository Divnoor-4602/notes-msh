import { components } from "./_generated/api";
import { Autumn } from "@useautumn/convex";
import { authComponent } from "./auth";

export const autumn = new Autumn(components.autumn, {
  secretKey: process.env.AUTUMN_SECRET_KEY ?? "",
  identify: async (ctx: any) => {
    try {
      // get the currently logged in user from better auth
      const user = await authComponent.getAuthUser(ctx);
      if (!user) return null;
      return {
        customerId: String(user._id),
        customerData: {
          name: (user as any).name ?? "",
          email: (user as any).email ?? "",
        },
      };
    } catch (_err) {
      return null;
    }
  },
});

export const {
  track,
  cancel,
  query,
  attach,
  check,
  checkout,
  usage,
  setupPayment,
  createCustomer,
  listProducts,
  billingPortal,
  createReferralCode,
  redeemReferralCode,
  createEntity,
  getEntity,
} = autumn.api();
