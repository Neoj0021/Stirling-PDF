package stirling.software.SPDF.config;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@ExtendWith(MockitoExtension.class)
class EndpointInterceptorTest {

    @Mock private HttpServletRequest request;
    @Mock private HttpServletResponse response;

    private EndpointInterceptor interceptor;

    @BeforeEach
    void setUp() {
        interceptor = new EndpointInterceptor();
    }

    @Test
    void preHandleAllowsAllRequests() throws Exception {
        when(request.getServletPath()).thenReturn("/api/v1/general/remove-pages");
        assertTrue(interceptor.preHandle(request, response, new Object()));
    }

    @Test
    void preHandleSetsCacheControlForApiPaths() throws Exception {
        when(request.getServletPath()).thenReturn("/api/v1/convert/pdf/img");
        interceptor.preHandle(request, response, new Object());
        verify(response).setHeader("Cache-Control", "private, no-store");
    }

    @Test
    void preHandleSkipsCacheControlForNonApiPaths() throws Exception {
        when(request.getServletPath()).thenReturn("/some-page");
        interceptor.preHandle(request, response, new Object());
        verify(response, never()).setHeader(anyString(), anyString());
    }
}
