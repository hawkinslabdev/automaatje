#  Automaatje

[![License](https://img.shields.io/badge/license-AGPL%203.0-blue)](LICENSE)
[![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/hawkinslabdev/automaatje/.github%2Fworkflows%2Fdocker.yml)](#)
[![Last commit](https://img.shields.io/github/last-commit/hawkinslabdev/automaatje)](https://github.com/hawkinslabdev/automaatje/commits/main)
[![Support](https://img.shields.io/badge/Support-Buy%20me%20a%20coffee-fdd734?logo=buy-me-a-coffee)](https://coff.ee/hawkinslabdev)

<img width="100%" alt="Automaatje screenshot" src="https://github.com/hawkinslabdev/automaatje/blob/main/.github/assets/screenshot.png?raw=true" />

This is **Automaatje**. It’s a web application for compliant mileage logging, built with full complacency towards the Dutch rules from the tax authority. No cloud service, full transparency of the source code. Just something you can run yourself and trust.

The idea is simple. Make it easy for homelab enthusiasts and small business owners to host their own mileage registration app that actually holds up in the Netherlands.

[**How it works**](#-getting-started) • [**Contributing**](#-contributing) • [**Donate**](#-donate)

## What is Automaatje?

In short: A modern, simple trip registration web-app for Dutch residents (complaint with Belastingdienst).

<details>
<summary>🇬🇧 In English</summary>
<br>
Automaatje exists because mileage tracking in the Netherlands is annoying in exactly the wrong way. It’s not complicated, but it’s easy to get wrong. Miss a trip, forget a note, or export the wrong format, and suddenly you’re second-guessing your own administration. This is a self-hosted mileage registration tool for people who like to keep control. Freelancers, business owners, employees with a lease car, and people who already run half their life from a server at home. It logs trips, calculates distances, and keeps records that match what the Belastingdienst expects to see.

The goal to be correct, predictable, and boring in the ways that matter.

</details>

<details>
<summary>🇳🇱 In het Nederlands</summary>
<br>
Automaatje is een self-hosted kilometerregistratie-app voor mensen die graag zelf de controle houden. Denk aan zzp’ers, ondernemers, werknemers met een leaseauto. De web-app registreert ritten, berekent afstanden en bewaart alles op een manier die aansluit bij de eisen van de Belastingdienst. 

Het doel van de app is om de registratie gewoon goed te doen, zonder enige complexiteit.

</details>

## Getting Started

The easiest way to get Automaatje running locally is with Docker Compose. Grab the compose file, start the stack, and you’re up.

```bash
mkdir automaatje && cd automaatje
curl -O https://raw.githubusercontent.com/hawkinslabdev/automaatje/refs/heads/main/docker-compose.yml && docker compose up -d
```

<details> <summary>🇬🇧 In English</summary>
<br>
The fastest way to get started is via Docker Compose. Download the compose file (see the script above), start the containers, and you're ready to test. From there, you can see if it fits with how you want to keep your records.
</details> <details> <summary>🇳🇱 In het Nederlands</summary>
<br>
De snelste manier om te starten is via Docker Compose. Download het compose-bestand (zie het script hierboven), start de containers en je bent klaar om te testen. Vanaf daar kun je kijken of het aansluit bij hoe jij je administratie wilt bijhouden.
</details> 

## Lore

The name “Automaatje” is a small Dutch wordplay. “Auto” means car, “maatje” means buddy or little friend. Together it sounds like a car buddy. Something that rides along with you and quietly keeps track of things. It also hints at automation, which is really the whole point.

## Donate

[![Buy Me A Coffee](https://img.shields.io/badge/Buy_me_a_coffee-fdd734?\&logo=buy-me-a-coffee\&logoColor=black\&style=for-the-badge)](https://coff.ee/hawkinslabdev)
[![GitHub Sponsors](https://img.shields.io/badge/GitHub_Sponsors-30363d?style=for-the-badge\&logo=github\&logoColor=white)](https://github.com/sponsors/hawkinslabdev)

If this saves you time, stress, or a spreadsheet, feel free to buy me a coffee or sponsor the project. It helps keep the coffee fresh.

## License

This project is licensed under the **AGPL 3.0** license. See [LICENSE](LICENSE) for details.

## Contributing

This is meant to be a community-driven project. Ideas, bug reports, and pull requests are all welcome. If something feels off or could be better, open an issue and let’s talk about it.
