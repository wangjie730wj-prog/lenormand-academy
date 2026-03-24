export type MeResponse = {
  user: {
    id: string;
    username: string;
    role: "ADMIN" | "STUDENT" | "PAID_STUDENT";
    status: "ACTIVE" | "DISABLED";
    sharedAccessUntil: string | Date | null;
    sharedAccessPermanent?: boolean;
    canReadSharedCase: boolean;
  } | null;
};
