PY ?= .venv/bin/python

.PHONY: install lint test openapi
install:
	python3 -m venv .venv && $(PY) -m pip install -e '.[dev]'
lint:
	$(PY) -m ruff check app tests
	$(PY) -m mypy app tests
test:
	$(PY) -m pytest --cov=app/services/engine --cov-report=term-missing
openapi:
	$(PY) scripts/export_openapi.py && cd ../frontend && npm run gen:api
