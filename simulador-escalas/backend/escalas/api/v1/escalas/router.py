from fastapi import APIRouter

from escalas.api.v1.escalas import auth, cadastros, catalog, patterns, roles, scenarios, structure

router = APIRouter()
for r in (auth.router, cadastros.router, catalog.router, patterns.router, roles.router,
          scenarios.router, structure.router):
    router.include_router(r)
