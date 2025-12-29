##################################
### Makefile - Substack ToC    ###
##################################

.DEFAULT_GOAL := help

# Extension name and version (from manifest.json)
EXT_NAME := substack-toc
VERSION := $(shell grep '"version"' manifest.json | sed 's/.*: "\(.*\)".*/\1/')

# Colors
CYAN := \033[36m
GREEN := \033[32m
YELLOW := \033[33m
RED := \033[31m
BOLD := \033[1m
RESET := \033[0m

.PHONY: help
help: ## Show available targets
	@printf "\n"
	@printf "$(BOLD)$(CYAN)Substack ToC Extension$(RESET) v$(VERSION)\n"
	@printf "$(YELLOW)Usage:$(RESET) make <target>\n"
	@printf "\n"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(CYAN)%-15s$(RESET) %s\n", $$1, $$2}'
	@printf "\n"

.PHONY: zip
zip: clean ## Create release zip for Chrome Web Store
	@printf "$(CYAN)Creating release zip...$(RESET)\n"
	@mkdir -p dist
	@zip -r dist/$(EXT_NAME)-v$(VERSION).zip \
		manifest.json \
		popup.html \
		popup.css \
		popup.js \
		content.js \
		icons/
	@printf "$(GREEN)Created:$(RESET) dist/$(EXT_NAME)-v$(VERSION).zip\n"

.PHONY: clean
clean: ## Remove build artifacts
	@printf "$(CYAN)Cleaning...$(RESET)\n"
	@rm -rf dist/
	@rm -f *.zip
	@printf "$(GREEN)Done$(RESET)\n"

.PHONY: dev
dev: ## Show instructions for local development
	@printf "\n"
	@printf "$(BOLD)Local Development Setup$(RESET)\n"
	@printf "\n"
	@printf "1. Open Chrome and go to: $(CYAN)chrome://extensions$(RESET)\n"
	@printf "2. Enable $(YELLOW)Developer mode$(RESET) (toggle in top right)\n"
	@printf "3. Click $(YELLOW)Load unpacked$(RESET)\n"
	@printf "4. Select this directory: $(CYAN)$(PWD)$(RESET)\n"
	@printf "\n"
	@printf "$(BOLD)Testing:$(RESET)\n"
	@printf "1. Go to any Substack post in edit mode\n"
	@printf "2. Click the extension icon\n"
	@printf "3. Verify ToC is generated and injection works\n"
	@printf "\n"

.PHONY: bump-patch
bump-patch: ## Bump patch version (1.0.0 -> 1.0.1)
	@printf "$(CYAN)Bumping patch version...$(RESET)\n"
	@CURRENT=$(VERSION); \
	MAJOR=$$(echo $$CURRENT | cut -d. -f1); \
	MINOR=$$(echo $$CURRENT | cut -d. -f2); \
	PATCH=$$(echo $$CURRENT | cut -d. -f3); \
	NEW_PATCH=$$((PATCH + 1)); \
	NEW_VERSION="$$MAJOR.$$MINOR.$$NEW_PATCH"; \
	sed -i '' "s/\"version\": \"$$CURRENT\"/\"version\": \"$$NEW_VERSION\"/" manifest.json; \
	printf "$(GREEN)Version bumped:$(RESET) $$CURRENT -> $$NEW_VERSION\n"

.PHONY: bump-minor
bump-minor: ## Bump minor version (1.0.0 -> 1.1.0)
	@printf "$(CYAN)Bumping minor version...$(RESET)\n"
	@CURRENT=$(VERSION); \
	MAJOR=$$(echo $$CURRENT | cut -d. -f1); \
	MINOR=$$(echo $$CURRENT | cut -d. -f2); \
	NEW_MINOR=$$((MINOR + 1)); \
	NEW_VERSION="$$MAJOR.$$NEW_MINOR.0"; \
	sed -i '' "s/\"version\": \"$$CURRENT\"/\"version\": \"$$NEW_VERSION\"/" manifest.json; \
	printf "$(GREEN)Version bumped:$(RESET) $$CURRENT -> $$NEW_VERSION\n"

.PHONY: validate
validate: ## Validate extension files exist
	@printf "$(CYAN)Validating extension files...$(RESET)\n"
	@ERRORS=0; \
	for f in manifest.json popup.html popup.css popup.js content.js; do \
		if [ ! -f "$$f" ]; then \
			printf "$(RED)Missing:$(RESET) $$f\n"; \
			ERRORS=$$((ERRORS + 1)); \
		fi; \
	done; \
	for f in icons/icon16.png icons/icon48.png icons/icon128.png; do \
		if [ ! -f "$$f" ]; then \
			printf "$(RED)Missing:$(RESET) $$f\n"; \
			ERRORS=$$((ERRORS + 1)); \
		fi; \
	done; \
	if [ $$ERRORS -eq 0 ]; then \
		printf "$(GREEN)All files present$(RESET)\n"; \
	else \
		printf "$(RED)$$ERRORS file(s) missing$(RESET)\n"; \
		exit 1; \
	fi
