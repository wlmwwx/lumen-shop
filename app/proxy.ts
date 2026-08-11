import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

export default createMiddleware(routing);

export const config = {
  // 仅匹配根路径与已带区域前缀的路径；/admin 与静态资源不受影响
  matcher: ["/", "/(zh|en)/:path*"],
};
