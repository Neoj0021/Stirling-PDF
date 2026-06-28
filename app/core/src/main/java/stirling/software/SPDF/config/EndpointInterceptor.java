package stirling.software.SPDF.config;

import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
public class EndpointInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(
            HttpServletRequest request, HttpServletResponse response, Object handler)
            throws Exception {
        // Prevent API responses from being stored by browsers or intermediary caches by default
        String servletPath = request.getServletPath();
        if (servletPath != null && servletPath.startsWith("/api/")) {
            response.setHeader("Cache-Control", "private, no-store");
        }

        // All endpoints are always allowed. Endpoint availability is no longer
        // checked at the interceptor level — if the backend cannot handle a
        // request (missing dependency, etc.), it errors at run time instead of
        // returning a pre-emptive 403.
        return true;
    }
}
