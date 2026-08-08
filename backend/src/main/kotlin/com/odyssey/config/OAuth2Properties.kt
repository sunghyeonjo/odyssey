package com.odyssey.config

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "oauth2")
data class OAuth2Properties(
    val google: ProviderProperties = ProviderProperties(),
) {
    data class ProviderProperties(
        val clientId: String = "",
        val clientSecret: String = "",
    )
}
