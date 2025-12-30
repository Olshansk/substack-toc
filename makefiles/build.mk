##########################
### Extension Build    ###
##########################

EXTENSION_NAME := substack-toc
VERSION := $(shell grep '"version"' manifest.json | sed 's/.*: "\([^"]*\)".*/\1/')

INCLUDE_FILES := \
	manifest.json \
	popup.html \
	popup.css \
	popup.js \
	content.js \
	icons

.PHONY: _build-zip-internal
_build-zip-internal: dev-clean $(BUILD_DIR)
	@VERSION=$$(grep '"version"' manifest.json | sed 's/.*: "\([^"]*\)".*/\1/'); \
	ZIP_FILE="$(BUILD_DIR)/$(EXTENSION_NAME)-v$$VERSION.zip"; \
	printf "\n"; \
	printf "$(GREEN)%s$(RESET)\n" "╔════════════════════════════════════════════════════════╗"; \
	printf "$(GREEN)%s$(RESET)\n" "║  📋 Building Substack ToC v$$VERSION                      ║"; \
	printf "$(GREEN)%s$(RESET)\n" "╚════════════════════════════════════════════════════════╝"; \
	printf "\n"; \
	mkdir -p $(BUILD_DIR)/staging; \
	cp -r $(INCLUDE_FILES) $(BUILD_DIR)/staging/; \
	cd $(BUILD_DIR)/staging && zip -rq ../$(EXTENSION_NAME)-v$$VERSION.zip .; \
	rm -rf $(BUILD_DIR)/staging; \
	printf "$(GREEN)$(CHECK) Created:$(RESET) $$ZIP_FILE\n"; \
	printf "\n"

.PHONY: _prompt-version-bump
_prompt-version-bump:
	@CURRENT_VERSION=$$(grep '"version"' manifest.json | sed 's/.*: "\([^"]*\)".*/\1/'); \
	MAJOR=$$(echo $$CURRENT_VERSION | cut -d. -f1); \
	MINOR=$$(echo $$CURRENT_VERSION | cut -d. -f2); \
	PATCH=$$(echo $$CURRENT_VERSION | cut -d. -f3); \
	V_MAJOR="$$((MAJOR + 1)).0.0"; \
	V_MINOR="$$MAJOR.$$((MINOR + 1)).0"; \
	V_PATCH="$$MAJOR.$$MINOR.$$((PATCH + 1))"; \
	printf "\n"; \
	printf "$(BOLD)Current version:$(RESET) $$CURRENT_VERSION\n"; \
	printf "\n"; \
	printf "$(YELLOW)Bump to:$(RESET)\n"; \
	printf "  $(CYAN)[1]$(RESET) $$V_MAJOR (major)\n"; \
	printf "  $(CYAN)[2]$(RESET) $$V_MINOR (minor)\n"; \
	printf "  $(CYAN)[3]$(RESET) $$V_PATCH (patch)\n"; \
	printf "  $(CYAN)[s]$(RESET) skip\n"; \
	printf "\n"; \
	printf "$(YELLOW)Choice [1/2/3/s]: $(RESET)"; \
	read choice; \
	case "$$choice" in \
		1) NEW_VERSION="$$V_MAJOR" ;; \
		2) NEW_VERSION="$$V_MINOR" ;; \
		3) NEW_VERSION="$$V_PATCH" ;; \
		s|S) printf "$(DIM)Skipped$(RESET)\n"; exit 0 ;; \
		*) printf "$(RED)Invalid$(RESET)\n"; exit 1 ;; \
	esac; \
	sed -i '' "s/\"version\": \"$$CURRENT_VERSION\"/\"version\": \"$$NEW_VERSION\"/" manifest.json; \
	printf "$(GREEN)$(CHECK) Bumped:$(RESET) $$CURRENT_VERSION → $$NEW_VERSION\n"

.PHONY: build-release
build-release: _prompt-version-bump _build-zip-internal ## Bump version, create zip for Chrome Web Store
	@printf "$(YELLOW)Next:$(RESET) Upload zip from $(CYAN)build/$(RESET) to Chrome Web Store\n\n"

.PHONY: build-zip
build-zip: _build-zip-internal ## Create zip without version bump

.PHONY: build-validate
build-validate: ## Check all required extension files exist
	@ERRORS=0; \
	for f in manifest.json popup.html popup.css popup.js content.js; do \
		if [ ! -f "$$f" ]; then \
			printf "$(RED)$(CROSS) Missing: $$f$(RESET)\n"; \
			ERRORS=$$((ERRORS + 1)); \
		fi; \
	done; \
	for f in icons/icon16.png icons/icon48.png icons/icon128.png; do \
		if [ ! -f "$$f" ]; then \
			printf "$(RED)$(CROSS) Missing: $$f$(RESET)\n"; \
			ERRORS=$$((ERRORS + 1)); \
		fi; \
	done; \
	if [ $$ERRORS -eq 0 ]; then \
		printf "$(GREEN)$(CHECK) All files present$(RESET)\n"; \
	else \
		printf "$(RED)$(CROSS) $$ERRORS file(s) missing$(RESET)\n"; \
		exit 1; \
	fi
