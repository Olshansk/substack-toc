####################
### Development  ###
####################

.PHONY: dev-start
dev-start: ## Print steps to load extension in Chrome
	@printf "\n"
	@printf "$(BOLD)Load in Chrome:$(RESET)\n"
	@printf "  1. Go to $(CYAN)chrome://extensions$(RESET)\n"
	@printf "  2. Enable $(YELLOW)Developer mode$(RESET) (top right)\n"
	@printf "  3. Click $(YELLOW)Load unpacked$(RESET) → select $(CYAN)$(ROOT_DIR)$(RESET)\n"
	@printf "\n"
	@printf "$(BOLD)Test:$(RESET)\n"
	@printf "  1. Open a Substack post in edit mode\n"
	@printf "  2. Click extension icon → verify ToC appears\n"
	@printf "  3. Click Inject → verify ToC inserted\n"
	@printf "\n"

.PHONY: dev-clean
dev-clean: ## Delete build/ and dist/ directories
	@rm -rf $(BUILD_DIR) $(DIST_DIR) *.zip
	@printf "$(GREEN)$(CHECK) Cleaned$(RESET)\n"

.PHONY: dev-info
dev-info: ## Print extension name and version from manifest
	@VERSION=$$(grep '"version"' manifest.json | sed 's/.*: "\([^"]*\)".*/\1/'); \
	NAME=$$(grep '"name"' manifest.json | sed 's/.*: "\([^"]*\)".*/\1/'); \
	printf "$(BOLD)$$NAME$(RESET) v$$VERSION\n"
