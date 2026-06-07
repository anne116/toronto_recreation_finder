export interface WebApplicationSchemaOptions {
    name: string;
    url: string;
    description: string;
}

export interface LocalBusinessSchemaOptions {
    name: string;
    address: {
        streetAddress: string;
        addressLocality: string;
        addressRegion: string;
        postalCode: string;
        addressCountry: string;
    };
    latitude: number;
    longitude: number;
    telephone?: string;
    url?: string;
}

export interface EventSchemaOptions {
    name: string;
    description: string;
    startDate: string;
    endDate?: string;
    location: {
        name: string;
        address: {
            streetAddress: string;
            addressLocality: string;
            addressRegion: string;
            postalCode: string;
            addressCountry: string;
        };
    };
    organizer?: {
        name: string;
        url?: string;
    };
}

export interface ItemListSchemaOptions {
    name: string;
    description: string;
    items: Array<{
        position: number;
        name: string;
        url: string;
    }>;
}

export function generateWebApplicationSchema(
    options: WebApplicationSchemaOptions
): object {
    return {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: options.name,
        url: options.url,
        description: options.description,
        applicationCategory: 'LifestyleApplication',
        operatingSystem: 'Web',
    };

}

export function generatedLocalBusinessSchema(
    options: LocalBusinessSchemaOptions
): object {
    return {
        '@context': 'https://schema.org',
        '@type': 'LocalBusiness',
        name: options.name,
        address: {
            '@type': 'PostalAddress',
            streetAddress: options.address.streetAddress,
            addressLocality: options.address.addressLocality,
            postalCode: options.address.postalCode,
            addressCountry: options.address.addressCountry,
        },
        geo:{
            '@type': 'GeoCoordinates',
            latitude: options.latitude,
            longitude: options.longitude,
        },
        ...(options.telephone && {telephone: options.telephone }),
        ...(options.url && { url: options.url }),
    };
}

export function generateEventSchema(options: EventSchemaOptions): object {
    return {
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: options.name,
        description: options.description,
        startDate: options.startDate,
        ...(options.endDate && { endDate: options.endDate }),
        location: {
            name: options.location.name,
            address: {
                '@type': 'PostalAddress',
                streetAddress: options.location.address.streetAddress,
                addressLocality: options.location.address.addressLocality,
                addressRegion: options.location.address.addressRegion,
                postalCode: options.location.address.postalCode,
                addressCountry: options.location.address.addressCountry,
            },
        },
        ...(options.organizer && {
            organizer: {
                '@type': 'Organization',
                name: options.organizer.name,
                ...(options.organizer.url && { url: options.organizer.url }),
            },
        }),
    };
}

export function generatedItemListedSchema(options: ItemListSchemaOptions): object {
    return {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: options.name,
        description: options.description,
        itemListElement: options.items.map((item) => ({
            '@type': 'ListItem',
            position: item.position,
            name: item.name,
            url: item.url,
        })),
    };
}