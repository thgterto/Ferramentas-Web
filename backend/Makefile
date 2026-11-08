PY ?= .venv/bin/python

.PHONY: install lint test
install:
	python3 -m venv .venv && $(PY) -m pip install -e '.[dev]'
lint:
	$(PY) -m ruff check app tests
	$(PY) -m mypy app tests
test:
	$(PY) -m pytest --cov=app/services/engine --cov-report=term-missing
