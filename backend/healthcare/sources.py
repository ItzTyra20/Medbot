"""
Controlled source suggestions.

For the hackathon MVP, use a small set of reputable medical-information
sources instead of allowing the assistant to search the entire web.

These links are presented as source suggestions. The LLM should not claim
that a source supports a specific statement unless the source content was
actually retrieved and inspected.
"""

SOURCE_CATALOG = [
    {
        "name": "MedlinePlus",
        "organization": "U.S. National Library of Medicine",
        "url": "https://medlineplus.gov/",
        "keywords": [
            "symptom", "disease", "condition", "medicine", "medication",
            "treatment", "health", "pain", "fever", "infection",
        ],
    },
    {
        "name": "CDC",
        "organization": "Centers for Disease Control and Prevention",
        "url": "https://www.cdc.gov/",
        "keywords": [
            "infection", "flu", "covid", "vaccine", "vaccination",
            "public health", "disease", "prevention", "outbreak",
        ],
    },
    {
        "name": "NIH",
        "organization": "National Institutes of Health",
        "url": "https://www.nih.gov/",
        "keywords": [
            "research", "disease", "condition", "health", "clinical",
            "treatment", "symptom",
        ],
    },
    {
        "name": "FDA",
        "organization": "U.S. Food and Drug Administration",
        "url": "https://www.fda.gov/",
        "keywords": [
            "drug", "medication", "medicine", "side effect", "food",
            "device", "recall", "dose",
        ],
    },
]


def find_sources(text: str) -> list[dict]:
    normalized = text.lower()

    matches = []

    for source in SOURCE_CATALOG:
        score = sum(1 for keyword in source["keywords"] if keyword in normalized)

        if score > 0:
            matches.append(
                {
                    "name": source["name"],
                    "organization": source["organization"],
                    "url": source["url"],
                    "relevance_score": score,
                }
            )

    matches.sort(key=lambda source: source["relevance_score"], reverse=True)

    # Always provide MedlinePlus as a fallback source for general health
    # questions, but do not pretend it specifically supports the claim.
    if not matches:
        matches.append(
            {
                "name": "MedlinePlus",
                "organization": "U.S. National Library of Medicine",
                "url": "https://medlineplus.gov/",
                "relevance_score": 0,
            }
        )

    return matches[:3]
