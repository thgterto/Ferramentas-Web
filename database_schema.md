# Database Schema for ATA Digital (Zero-Install)

This document defines the structure of the `database.json` file used for persistence in the ATA Digital application.
The file acts as a local database, storing configuration, learned dictionary terms for autocomplete, and the history of shift handovers.

## JSON Structure

```json
{
  "meta": {
    "version": "1.0",
    "last_updated": "2023-10-27T10:00:00.000Z",
    "generator": "ATA Digital v3.1"
  },
  "settings": {
    "description": "Persisted application configuration to ensure consistency across users.",
    "units": [
      "UAE - Água Emendada",
      "UAT - Alto Taquari",
      "..."
    ],
    "shifts": [
      "Turno A (06:00 - 14:00)",
      "..."
    ],
    "classifications": [
      "Parada de Processo",
      "..."
    ],
    "equipments": [
      "Balança Rodoviária 1",
      "..."
    ]
  },
  "dictionary": {
    "description": "Smart Autocomplete dictionary. Keys correspond to input field IDs or types.",
    "responsible": [
      "João Silva",
      "Maria Souza"
    ],
    "sbar_s": [
      "Vazamento na bomba de óleo",
      "Ruído anormal no motor"
    ],
    "sbar_b": [
      "Equipamento operando há 48h sem parada",
      "Manutenção preventiva realizada na semana anterior"
    ],
    "sbar_a": [
      "Necessária troca de retentor",
      "Ajuste de correia"
    ],
    "sbar_r": [
      "Solicitar Ordem de Serviço",
      "Monitorar temperatura a cada hora"
    ]
  },
  "history": [
    {
      "id": "uuid-v4-or-timestamp",
      "created_at": "2023-10-27T14:30:00.000Z",
      "header": {
        "date": "2023-10-27",
        "shift": "Turno A (06:00 - 14:00)",
        "unit": "UAE - Água Emendada",
        "responsible": "João Silva"
      },
      "kpi": {
        "score": 95,
        "status": "Concluído"
      },
      "checklist": {
        "0": {
          "0": "SIM",
          "1": "NÃO",
          "2": "NA"
        },
        "1": { ... }
      },
      "sbar_entries": {
        "0": {
          "12": {
            "type": "Manutenção",
            "s": "Vazamento na bomba",
            "b": "Ocorreu após pico de energia",
            "a": "Verificado retentor danificado",
            "r": "Trocar retentor no próximo turno"
          }
        }
      }
    }
  ]
}
```

## Normalization Rules (Dictionary)
To ensure the "Smart Dictionary" remains clean and effective, all new entries are processed through a normalization function before being added:
1.  **Trim**: Remove leading/trailing whitespace.
2.  **Collapse Spaces**: Replace multiple spaces with a single space (`/\s+/g`).
3.  **Capitalization**: Ensure the first letter is uppercase (`sentence case`).
4.  **Deduplication**: Case-insensitive check against existing entries.

## Persistence Flow
1.  **Load**: User uploads `database.json`. App parses it, populates `settings` (dropdowns), `dictionary` (autocompletes), and loads `history` into memory.
2.  **Operate**: User fills out the ATA. Autocomplete suggests terms from `dictionary`.
3.  **Save**: User clicks "Finalizar/Salvar".
    *   App appends current ATA to `history`.
    *   App scans all new text inputs (Responsible, SBAR fields).
    *   New terms are normalized and added to `dictionary` if not present.
    *   App generates a new `database.json` blob and triggers a download.
