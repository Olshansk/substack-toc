##########################
### Extension Build    ###
##########################

EXTENSION_NAME := substack-toc
VERSION = $(shell node -p "require('./manifest.json').version")

.PHONY: build-zip
build-zip: build-validate ## Create zip without version bump
	@mkdir -p "$(BUILD_DIR)"
	@rm -f "$(BUILD_DIR)/$(EXTENSION_NAME)-v$(VERSION).zip"
	@zip -rq "$(BUILD_DIR)/$(EXTENSION_NAME)-v$(VERSION).zip" manifest.json src icons -x '*/.DS_Store'
	@printf "$(GREEN)$(CHECK) Created:$(RESET) $(BUILD_DIR)/$(EXTENSION_NAME)-v$(VERSION).zip\n"

.PHONY: _prompt-version-bump
_prompt-version-bump:
	@node scripts/bump-version.mjs

.PHONY: build-release
build-release: ## Bump version, validate, and create zip for Chrome Web Store
	@$(MAKE) dev-test
	@$(MAKE) _prompt-version-bump
	@$(MAKE) build-test
	@printf "$(YELLOW)Next:$(RESET) Upload zip from $(CYAN)build/$(RESET) to Chrome Web Store\n"

.PHONY: build-validate
build-validate: ## Validate manifest, referenced assets, and JavaScript syntax
	@node scripts/validate.mjs

.PHONY: build-test
build-test: build-zip ## Extract and verify the release archive
	@node scripts/check-package.mjs
