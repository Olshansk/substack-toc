##########################
### Common Utilities   ###
##########################

# Strict shell + sane make defaults

SHELL := /bin/bash
.SHELLFLAGS := -eu -o pipefail -c
MAKEFLAGS += --warn-undefined-variables
MAKEFLAGS += --no-builtin-rules

# VERBOSE=1 to show commands

ifdef VERBOSE
	Q :=
else
	Q := @
endif

# Timestamp & common dirs

TIMESTAMP := $(shell date '+%Y-%m-%d %H:%M:%S')
ROOT_DIR := $(shell pwd)
BUILD_DIR := $(ROOT_DIR)/build
DIST_DIR := $(ROOT_DIR)/dist

$(BUILD_DIR) $(DIST_DIR):
	$(Q)mkdir -p $@

# Guards & checks

define check_command
	@command -v $(1) >/dev/null 2>&1 || { \
		printf "$(RED)$(CROSS) Missing tool: $(1)$(RESET)\n"; \
		exit 1; \
	}
endef
