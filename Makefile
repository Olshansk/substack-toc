#################################
### Makefile - Substack ToC   ###
#################################

.DEFAULT_GOAL := help

################
### Imports  ###
################

include ./makefiles/colors.mk
include ./makefiles/common.mk
include ./makefiles/build.mk
include ./makefiles/dev.mk

################
### Help     ###
################

.PHONY: help
help: ## List all targets with descriptions
	@printf "\n"
	@printf "$(BOLD)$(CYAN)📋 Substack ToC$(RESET)\n"
	@printf "$(YELLOW)Usage:$(RESET) make <target>\n"
	@printf "\n"
	@printf "$(BOLD)=== 🏗️  Build ===$(RESET)\n"
	@grep -h -E '^build-.*:.*?## .*$$' $(MAKEFILE_LIST) ./makefiles/*.mk 2>/dev/null | awk 'BEGIN {FS = ":.*?## "}; {printf "$(CYAN)%-20s$(RESET) %s\n", $$1, $$2}' | sort -u
	@printf "\n"
	@printf "$(BOLD)=== 🔧 Dev ===$(RESET)\n"
	@grep -h -E '^dev-.*:.*?## .*$$' $(MAKEFILE_LIST) ./makefiles/*.mk 2>/dev/null | awk 'BEGIN {FS = ":.*?## "}; {printf "$(CYAN)%-20s$(RESET) %s\n", $$1, $$2}' | sort -u
	@printf "\n"
	@printf "$(BOLD)=== ℹ️  Help ===$(RESET)\n"
	@grep -h -E '^help.*:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "$(CYAN)%-20s$(RESET) %s\n", $$1, $$2}'
	@printf "\n"

###############################
###  Global Error Handling  ###
###############################

%:
	@printf "\n"
	@printf "$(RED)❌ Unknown target '$(BOLD)$@$(RESET)$(RED)'$(RESET)\n"
	@printf "   Run $(CYAN)make help$(RESET) to see available targets\n"
	@printf "\n"
	@exit 1
