CREATE TABLE
    IF NOT EXISTS Users (
        id INT NOT NULL AUTO_INCREMENT,
        full_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        phone VARCHAR(20) NULL UNIQUE,
        password VARCHAR(255) NULL,
        google_sub VARCHAR(255) NULL UNIQUE,
        role ENUM ('user', 'admin') DEFAULT 'user',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        login_at TIMESTAMP NULL,
        PRIMARY KEY (id),
        INDEX idx_users_email (email),
        INDEX idx_users_phone (phone)
    );

CREATE TABLE
    IF NOT EXISTS Details (
        id INT NOT NULL AUTO_INCREMENT,
        user_id INT NOT NULL,
        business_name VARCHAR(150) NOT NULL,
        services JSON NOT NULL,
        working_hours JSON NOT NULL,
        slot_duration_minutes INT NOT NULL DEFAULT 30,
        timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata',
        voice VARCHAR(50) NOT NULL DEFAULT 'Kore',
        custom_instructions TEXT NULL,
        calendar_id VARCHAR(255) NULL,
        google_refresh_token TEXT NULL,
        whatsapp_token TEXT NULL,
        whatsapp_phone_number_id VARCHAR(50) NULL,
        exotel_numbers JSON NULL,
        max_concurrent_calls INT NOT NULL DEFAULT 3,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        FOREIGN KEY (user_id) REFERENCES Users (id) ON DELETE CASCADE,
        INDEX idx_business_user (user_id)
    );

CREATE TABLE
    IF NOT EXISTS queue_counters (
        business_id INT NOT NULL,
        token_date DATE NOT NULL,
        last_token INT NOT NULL DEFAULT 0,
        PRIMARY KEY (business_id, token_date),
        CONSTRAINT fk_queue_counters_business FOREIGN KEY (business_id) REFERENCES Details (id) ON DELETE CASCADE
    );

CREATE TABLE
    IF NOT EXISTS queue_visits (
        id BIGINT NOT NULL AUTO_INCREMENT,
        business_id INT NOT NULL,
        token_date DATE NOT NULL,
        token_number INT NOT NULL,
        patient_name VARCHAR(100) NOT NULL,
        patient_phone VARCHAR(24) NOT NULL,
        status ENUM ('waiting', 'ongoing', 'done', 'cancelled') NOT NULL DEFAULT 'waiting',
        payment_status ENUM ('pending', 'paid', 'waived') NOT NULL DEFAULT 'pending',
        payment_amount DECIMAL(10, 2) NULL,
        payment_method ENUM ('cash', 'card', 'upi', 'other') NULL,
        paid_at DATETIME NULL,
        paid_date DATE NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_queue_daily_token (business_id, token_date, token_number),
        KEY idx_queue_today (business_id, token_date, status, token_number),
        KEY idx_queue_revenue (business_id, payment_status, paid_date),
        CONSTRAINT fk_queue_visits_business FOREIGN KEY (business_id) REFERENCES Details (id) ON DELETE CASCADE
    );

CREATE TABLE
    IF NOT EXISTS whatsapp_connections (
        id INT NOT NULL AUTO_INCREMENT,
        user_id INT NOT NULL,
        waba_id VARCHAR(64) NOT NULL,
        phone_number_id VARCHAR(64) NOT NULL,
        display_phone VARCHAR(32) NOT NULL,
        access_token_enc TEXT NOT NULL,
        status ENUM ('active', 'disconnected') NOT NULL DEFAULT 'active',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_whatsapp_connections_phone_number_id (phone_number_id),
        KEY idx_whatsapp_connections_user_id (user_id),
        CONSTRAINT fk_whatsapp_connections_user FOREIGN KEY (user_id) REFERENCES Users (id) ON DELETE CASCADE
    );

CREATE TABLE
    IF NOT EXISTS wa_messages (
        id BIGINT NOT NULL AUTO_INCREMENT,
        connection_id INT NOT NULL,
        wa_message_id VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(32) NOT NULL,
        direction ENUM ('in', 'out') NOT NULL,
        body TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_wa_messages_message_id (wa_message_id),
        KEY idx_wa_messages_conversation (connection_id, customer_phone, created_at),
        CONSTRAINT fk_wa_messages_connection FOREIGN KEY (connection_id) REFERENCES whatsapp_connections (id) ON DELETE CASCADE
    );
