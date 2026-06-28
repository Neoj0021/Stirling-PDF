package stirling.software.SPDF.controller.api;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;

import io.swagger.v3.oas.annotations.Operation;

import lombok.Data;
import lombok.extern.slf4j.Slf4j;

import stirling.software.SPDF.model.Dependency;
import stirling.software.SPDF.model.SignatureFile;
import stirling.software.SPDF.service.SharedSignatureService;
import stirling.software.common.annotations.api.UiDataApi;
import stirling.software.common.configuration.InstallationPathConfig;
import stirling.software.common.configuration.RuntimePathConfig;
import stirling.software.common.model.ApplicationProperties;
import stirling.software.common.service.UserServiceInterface;
import stirling.software.common.util.ExceptionUtils;
import stirling.software.common.util.GeneralUtils;

import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

@Slf4j
@UiDataApi
public class UIDataController {

    private final ApplicationProperties applicationProperties;
    private final SharedSignatureService signatureService;
    private final UserServiceInterface userService;
    private final ResourceLoader resourceLoader;
    private final RuntimePathConfig runtimePathConfig;
    private final ObjectMapper objectMapper;

    public UIDataController(
            ApplicationProperties applicationProperties,
            SharedSignatureService signatureService,
            @Autowired(required = false) UserServiceInterface userService,
            ResourceLoader resourceLoader,
            RuntimePathConfig runtimePathConfig,
            ObjectMapper objectMapper) {
        this.applicationProperties = applicationProperties;
        this.signatureService = signatureService;
        this.userService = userService;
        this.resourceLoader = resourceLoader;
        this.runtimePathConfig = runtimePathConfig;
        this.objectMapper = objectMapper;
    }

    @GetMapping("/footer-info")
    @Operation(summary = "Get public footer configuration data")
    public ResponseEntity<FooterData> getFooterData() {
        FooterData data = new FooterData();
        data.setAnalyticsEnabled(applicationProperties.getSystem().getEnableAnalytics());
        data.setTermsAndConditions(applicationProperties.getLegal().getTermsAndConditions());
        data.setPrivacyPolicy(applicationProperties.getLegal().getPrivacyPolicy());
        data.setAccessibilityStatement(
                applicationProperties.getLegal().getAccessibilityStatement());
        data.setCookiePolicy(applicationProperties.getLegal().getCookiePolicy());
        data.setImpressum(applicationProperties.getLegal().getImpressum());

        return ResponseEntity.ok(data);
    }

    @GetMapping("/home")
    @Operation(summary = "Get home page data")
    public ResponseEntity<HomeData> getHomeData() {
        String showSurvey = System.getenv("SHOW_SURVEY");
        boolean showSurveyValue = showSurvey == null || "true".equalsIgnoreCase(showSurvey);

        HomeData data = new HomeData();
        data.setShowSurveyFromDocker(showSurveyValue);

        return ResponseEntity.ok(data);
    }

    @GetMapping("/licenses")
    @Operation(summary = "Get third-party licenses data")
    public ResponseEntity<LicensesData> getLicensesData() {
        LicensesData data = new LicensesData();
        Resource resource = new ClassPathResource("static/3rdPartyLicenses.json");

        try (InputStream is = resource.getInputStream()) {
            Map<String, List<Dependency>> licenseData =
                    objectMapper.readValue(is, new TypeReference<>() {});
            data.setDependencies(licenseData.get("dependencies"));
        } catch (IOException e) {
            log.error("Failed to load licenses data", e);
            data.setDependencies(Collections.emptyList());
        }

        return ResponseEntity.ok(data);
    }

    @GetMapping("/pipeline")
    @Operation(summary = "Get pipeline configuration data")
    public ResponseEntity<PipelineData> getPipelineData() {
        PipelineData data = new PipelineData();
        List<String> pipelineConfigs = new ArrayList<>();
        List<Map<String, String>> pipelineConfigsWithNames = new ArrayList<>();

        if (new java.io.File(runtimePathConfig.getPipelineDefaultWebUiConfigs()).exists()) {
            try (Stream<Path> paths =
                    Files.walk(Path.of(runtimePathConfig.getPipelineDefaultWebUiConfigs()))) {
                List<Path> jsonFiles =
                        paths.filter(Files::isRegularFile)
                                .filter(p -> p.toString().endsWith(".json"))
                                .toList();

                for (Path jsonFile : jsonFiles) {
                    String content = Files.readString(jsonFile, StandardCharsets.UTF_8);
                    pipelineConfigs.add(content);
                }

                for (String config : pipelineConfigs) {
                    Map<String, Object> jsonContent =
                            objectMapper.readValue(
                                    config, new TypeReference<Map<String, Object>>() {});
                    String name = (String) jsonContent.get("name");
                    if (name == null || name.length() < 1) {
                        String filename =
                                jsonFiles
                                        .get(pipelineConfigs.indexOf(config))
                                        .getFileName()
                                        .toString();
                        name = filename.substring(0, filename.lastIndexOf('.'));
                    }
                    Map<String, String> configWithName = new HashMap<>();
                    configWithName.put("json", config);
                    configWithName.put("name", name);
                    pipelineConfigsWithNames.add(configWithName);
                }
            } catch (IOException e) {
                log.error("Failed to load pipeline configs", e);
            }
        }

        if (pipelineConfigsWithNames.isEmpty()) {
            Map<String, String> configWithName = new HashMap<>();
            configWithName.put("json", "");
            configWithName.put("name", "No preloaded configs found");
            pipelineConfigsWithNames.add(configWithName);
        }

        data.setPipelineConfigsWithNames(pipelineConfigsWithNames);
        data.setPipelineConfigs(pipelineConfigs);

        return ResponseEntity.ok(data);
    }

    @GetMapping("/sign")
    @Operation(summary = "Get signature form data")
    public ResponseEntity<SignData> getSignData() {
        String username = "";
        if (userService != null) {
            username = userService.getCurrentUsername();
        }

        List<SignatureFile> signatures = signatureService.getAvailableSignatures(username);
        List<FontResource> fonts = getFontNames();

        SignData data = new SignData();
        data.setSignatures(signatures);
        data.setFonts(fonts);

        return ResponseEntity.ok(data);
    }

    private List<FontResource> getFontNames() {
        List<FontResource> fontNames = new ArrayList<>();
        fontNames.addAll(getFontNamesFromLocation("classpath:static/fonts/*.woff2"));
        fontNames.addAll(
                getFontNamesFromLocation(
                        "file:"
                                + InstallationPathConfig.getStaticPath()
                                + "fonts"
                                + java.io.File.separator
                                + "*"));
        return fontNames;
    }

    private List<FontResource> getFontNamesFromLocation(String locationPattern) {
        try {
            Resource[] resources =
                    GeneralUtils.getResourcesFromLocationPattern(locationPattern, resourceLoader);
            return Arrays.stream(resources)
                    .map(
                            resource -> {
                                try {
                                    String filename = resource.getFilename();
                                    if (filename != null) {
                                        int lastDotIndex = filename.lastIndexOf('.');
                                        if (lastDotIndex != -1) {
                                            String name = filename.substring(0, lastDotIndex);
                                            String extension = filename.substring(lastDotIndex + 1);
                                            return new FontResource(name, extension);
                                        }
                                    }
                                    return null;
                                } catch (Exception e) {
                                    throw ExceptionUtils.createRuntimeException(
                                            "error.fontLoadingFailed",
                                            "Error processing font file",
                                            e);
                                }
                            })
                    .filter(Objects::nonNull)
                    .toList();
        } catch (Exception e) {
            throw ExceptionUtils.createRuntimeException(
                    "error.fontDirectoryReadFailed", "Failed to read font directory", e);
        }
    }

    /** Install a user-supplied font file permanently under customFiles/static/fonts/. */
    @PostMapping(value = "/fonts/install", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @io.swagger.v3.oas.annotations.Operation(summary = "Install a font file permanently")
    public ResponseEntity<InstalledFontData> installFont(
            @RequestParam("file") MultipartFile file,
            @RequestParam("family") String family,
            @RequestParam("weight") String weight,
            @RequestParam("style") String style)
            throws IOException {

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        // Build a safe filename: strip non-alphanumeric/space, spaces→hyphens
        String safeName = family.replaceAll("[^a-zA-Z0-9 ]", "").trim().replace(" ", "-");
        String filename = safeName + "-" + weight + "-" + style + ".woff2";

        Path fontsDir =
                Path.of(
                        stirling.software.common.configuration.InstallationPathConfig
                                .getStaticPath(),
                        "fonts");
        Files.createDirectories(fontsDir);
        Path target = fontsDir.resolve(filename);
        Files.write(target, file.getBytes());

        // /fonts/** is served with a 1-year immutable cache, so re-installing the
        // same filename must change the URL or browsers keep the stale bytes.
        long version = Files.getLastModifiedTime(target).toMillis();

        InstalledFontData data = new InstalledFontData();
        data.setFamily(family);
        data.setWeight(weight);
        data.setStyle(style);
        data.setUrl("/fonts/" + filename + "?v=" + version);
        return ResponseEntity.ok(data);
    }

    /** Return metadata for all user-installed fonts in customFiles/static/fonts/. */
    @GetMapping("/fonts/installed")
    @io.swagger.v3.oas.annotations.Operation(summary = "List user-installed fonts")
    public ResponseEntity<List<InstalledFontData>> getInstalledFonts() {
        Path fontsDir =
                Path.of(
                        stirling.software.common.configuration.InstallationPathConfig
                                .getStaticPath(),
                        "fonts");
        if (!Files.exists(fontsDir)) {
            return ResponseEntity.ok(Collections.emptyList());
        }

        List<InstalledFontData> result = new ArrayList<>();
        Pattern p = Pattern.compile("^(.+)-(\\d+)-(normal|italic|oblique)\\.woff2$");

        try (Stream<Path> paths = Files.list(fontsDir)) {
            paths.forEach(
                    path -> {
                        String name = path.getFileName().toString();
                        Matcher m = p.matcher(name);
                        if (m.matches()) {
                            long version;
                            try {
                                version = Files.getLastModifiedTime(path).toMillis();
                            } catch (IOException e) {
                                version = 0L;
                            }
                            InstalledFontData d = new InstalledFontData();
                            d.setFamily(m.group(1).replace("-", " "));
                            d.setWeight(m.group(2));
                            d.setStyle(m.group(3));
                            d.setUrl("/fonts/" + name + "?v=" + version);
                            result.add(d);
                        }
                    });
        } catch (IOException e) {
            log.error("Failed to list installed fonts", e);
        }
        return ResponseEntity.ok(result);
    }

    // Data classes
    @Data
    public static class FooterData {
        private Boolean analyticsEnabled;
        private String termsAndConditions;
        private String privacyPolicy;
        private String accessibilityStatement;
        private String cookiePolicy;
        private String impressum;
    }

    @Data
    public static class HomeData {
        private boolean showSurveyFromDocker;
    }

    @Data
    public static class LicensesData {
        private List<Dependency> dependencies;
    }

    @Data
    public static class PipelineData {
        private List<Map<String, String>> pipelineConfigsWithNames;
        private List<String> pipelineConfigs;
    }

    @Data
    public static class SignData {
        private List<SignatureFile> signatures;
        private List<FontResource> fonts;
    }

    @Data
    public static class InstalledFontData {
        private String family;
        private String weight;
        private String style;
        private String url;
    }

    @Data
    public static class FontResource {
        private String name;
        private String extension;
        private String type;

        public FontResource(String name, String extension) {
            this.name = name;
            this.extension = extension;
            this.type = getFormatFromExtension(extension);
        }

        private static String getFormatFromExtension(String extension) {
            switch (extension) {
                case "ttf":
                    return "truetype";
                case "woff":
                    return "woff";
                case "woff2":
                    return "woff2";
                case "eot":
                    return "embedded-opentype";
                case "svg":
                    return "svg";
                default:
                    return "";
            }
        }
    }
}
