import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>) {
  await sql`
    --
    -- PostgreSQL database dump
    --

    -- Dumped from database version 15.4 (Ubuntu 15.4-2.pgdg22.04+1)
    -- Dumped by pg_dump version 15.5 (Homebrew)

    --
    -- Name: cube; Type: EXTENSION; Schema: -; Owner: -
    --

    CREATE EXTENSION IF NOT EXISTS cube WITH SCHEMA public;


    --
    -- Name: EXTENSION cube; Type: COMMENT; Schema: -; Owner: 
    --

    COMMENT ON EXTENSION cube IS 'data type for multidimensional cubes';


    --
    -- Name: earthdistance; Type: EXTENSION; Schema: -; Owner: -
    --

    CREATE EXTENSION IF NOT EXISTS earthdistance WITH SCHEMA public;


    --
    -- Name: EXTENSION earthdistance; Type: COMMENT; Schema: -; Owner: 
    --

    COMMENT ON EXTENSION earthdistance IS 'calculate great-circle distances on the surface of the Earth';


    --
    -- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
    --

    CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


    --
    -- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: 
    --

    COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


    --
    -- Name: applications_other_demographics_enum; Type: TYPE; Schema: public; Owner: postgres
    --

    CREATE TYPE public.applications_other_demographics_enum AS ENUM (
        'DISABILITY',
        'FIRST_GENERATION',
        'LOW_INCOME'
    );

    --
    -- Name: applications_race_enum; Type: TYPE; Schema: public; Owner: postgres
    --

    CREATE TYPE public.applications_race_enum AS ENUM (
        'ASIAN',
        'BLACK',
        'HISPANIC',
        'MIDDLE_EASTERN',
        'NATIVE_AMERICAN',
        'OTHER',
        'WHITE'
    );

    --
    -- Name: students_other_demographics_enum; Type: TYPE; Schema: public; Owner: postgres
    --

    CREATE TYPE public.students_other_demographics_enum AS ENUM (
        'DISABILITY',
        'FIRST_GENERATION',
        'LOW_INCOME'
    );


    --
    -- Name: students_race_enum; Type: TYPE; Schema: public; Owner: postgres
    --

    CREATE TYPE public.students_race_enum AS ENUM (
        'ASIAN',
        'BLACK',
        'HISPANIC',
        'MIDDLE_EASTERN',
        'NATIVE_AMERICAN',
        'OTHER',
        'WHITE'
    );


    SET default_tablespace = '';

    SET default_table_access_method = heap;

    --
    -- Name: activities; Type: TABLE; Schema: public; Owner: postgres
    --

    CREATE TABLE public.activities (
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        deleted_at timestamp with time zone,
        id text NOT NULL,
        updated_at timestamp with time zone DEFAULT now() NOT NULL,
        type text NOT NULL,
        description text,
        name text NOT NULL,
        points smallint NOT NULL,
        period text
    );

    --
    -- Name: admins; Type: TABLE; Schema: public; Owner: postgres
    --

    CREATE TABLE public.admins (
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        deleted_at timestamp with time zone,
        id text NOT NULL,
        updated_at timestamp with time zone DEFAULT now() NOT NULL,
        email text NOT NULL,
        first_name text NOT NULL,
        last_name text NOT NULL,
        is_ambassador boolean DEFAULT false NOT NULL
    );

    --
    -- Name: applications; Type: TABLE; Schema: public; Owner: postgres
    --

    CREATE TABLE public.applications (
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        deleted_at timestamp with time zone,
        id text NOT NULL,
        updated_at timestamp with time zone DEFAULT now() NOT NULL,
        accepted_at timestamp with time zone,
        contribution text NOT NULL,
        education_level text NOT NULL,
        email text NOT NULL,
        first_name text NOT NULL,
        gender text NOT NULL,
        goals text NOT NULL,
        graduation_year integer NOT NULL,
        last_name text NOT NULL,
        linked_in_url text NOT NULL,
        major text NOT NULL,
        other_demographics text[] NOT NULL,
        other_major text,
        other_school text,
        race text[] NOT NULL,
        rejected_at timestamp with time zone,
        school_id text,
        status text NOT NULL,
        reviewed_by_id text
    );

    --
    -- Name: companies; Type: TABLE; Schema: public; Owner: postgres
    --

    CREATE TABLE public.companies (
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        deleted_at timestamp with time zone,
        id text NOT NULL,
        updated_at timestamp with time zone DEFAULT now() NOT NULL,
        name text NOT NULL,
        crunchbase_id text NOT NULL,
        description text,
        domain text,
        image_url text,
        stock_symbol text
    );

    --
    -- Name: completed_activities; Type: TABLE; Schema: public; Owner: postgres
    --

    CREATE TABLE public.completed_activities (
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        id text NOT NULL,
        activity_id text,
        occurred_at timestamp with time zone NOT NULL,
        points smallint NOT NULL,
        student_id text NOT NULL,
        channel_id text,
        message_reacted_to text,
        thread_replied_to text,
        event_attended text,
        type text NOT NULL,
        survey_responded_to text,
        description text
    );

    --
    -- Name: countries; Type: TABLE; Schema: public; Owner: postgres
    --

    CREATE TABLE public.countries (
        code text NOT NULL,
        demonym text NOT NULL,
        flag_emoji text NOT NULL,
        latitude text NOT NULL,
        longitude text NOT NULL,
        name text NOT NULL,
        region text NOT NULL,
        subregion text
    );

    --
    -- Name: educations; Type: TABLE; Schema: public; Owner: postgres
    --

    CREATE TABLE public.educations (
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        deleted_at timestamp with time zone,
        id text NOT NULL,
        updated_at timestamp with time zone DEFAULT now() NOT NULL,
        degree_type text NOT NULL,
        end_date date NOT NULL,
        major text NOT NULL,
        other_major text,
        other_school text,
        school_id text,
        start_date date NOT NULL,
        student_id text NOT NULL
    );

    --
    -- Name: email_campaign_clicks; Type: TABLE; Schema: public; Owner: postgres
    --

    CREATE TABLE public.email_campaign_clicks (
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        deleted_at timestamp with time zone,
        id text NOT NULL,
        updated_at timestamp with time zone DEFAULT now() NOT NULL,
        campaign_id text NOT NULL,
        clicked_at timestamp with time zone NOT NULL,
        email text NOT NULL,
        link_id text NOT NULL,
        platform text NOT NULL,
        student_id text
    );

    --
    -- Name: email_campaign_links; Type: TABLE; Schema: public; Owner: postgres
    --

    CREATE TABLE public.email_campaign_links (
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        deleted_at timestamp with time zone,
        id text NOT NULL,
        updated_at timestamp with time zone DEFAULT now() NOT NULL,
        campaign_id text NOT NULL,
        url text NOT NULL,
        platform text NOT NULL
    );

    --
    -- Name: email_campaign_opens; Type: TABLE; Schema: public; Owner: postgres
    --

    CREATE TABLE public.email_campaign_opens (
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        deleted_at timestamp with time zone,
        id text NOT NULL,
        updated_at timestamp with time zone DEFAULT now() NOT NULL,
        campaign_id text NOT NULL,
        email text NOT NULL,
        opened_at timestamp with time zone NOT NULL,
        platform text NOT NULL,
        student_id text
    );

    --
    -- Name: email_campaigns; Type: TABLE; Schema: public; Owner: postgres
    --

    CREATE TABLE public.email_campaigns (
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        deleted_at timestamp with time zone,
        id text NOT NULL,
        updated_at timestamp with time zone DEFAULT now() NOT NULL,
        content text NOT NULL,
        list_id text NOT NULL,
        platform text NOT NULL,
        sent_at timestamp with time zone,
        subject text NOT NULL,
        title text,
        archive_url text,
        sent_count integer,
        last_synced_at timestamp with time zone
    );

    --
    -- Name: email_lists; Type: TABLE; Schema: public; Owner: postgres
    --

    CREATE TABLE public.email_lists (
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        deleted_at timestamp with time zone,
        id text NOT NULL,
        updated_at timestamp with time zone DEFAULT now() NOT NULL,
        name text NOT NULL,
        platform text NOT NULL
    );

    --
    -- Name: event_attendees; Type: TABLE; Schema: public; Owner: postgres
    --

    CREATE TABLE public.event_attendees (
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        email text NOT NULL,
        name text,
        student_id text,
        event_id text NOT NULL
    );

    --
    -- Name: event_registrations; Type: TABLE; Schema: public; Owner: postgres
    --

    CREATE TABLE public.event_registrations (
        email text NOT NULL,
        event_id text NOT NULL,
        registered_at timestamp with time zone NOT NULL,
        student_id text NOT NULL
    );

    --
    -- Name: events; Type: TABLE; Schema: public; Owner: postgres
    --

    CREATE TABLE public.events (
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        deleted_at timestamp with time zone,
        id text NOT NULL,
        end_time timestamp with time zone NOT NULL,
        name text NOT NULL,
        start_time timestamp with time zone NOT NULL,
        type text NOT NULL,
        description text,
        external_link text
    );

    --
    -- Name: icebreaker_prompts; Type: TABLE; Schema: public; Owner: postgres
    --

    CREATE TABLE public.icebreaker_prompts (
        deleted_at timestamp with time zone,
        id text NOT NULL,
        text text NOT NULL
    );

    --
    -- Name: icebreaker_responses; Type: TABLE; Schema: public; Owner: postgres
    --

    CREATE TABLE public.icebreaker_responses (
        id text NOT NULL,
        prompt_id text NOT NULL,
        responded_at timestamp with time zone DEFAULT now() NOT NULL,
        student_id text NOT NULL,
        text text NOT NULL
    );

    --
    -- Custom...
    --

    --
    -- Name: member_ethnicities; Type: TABLE; Schema: public; Owner: postgres
    --

    CREATE TABLE public.member_ethnicities (
        country_code text NOT NULL,
        student_id text NOT NULL
    );

    --
    -- Name: migrations; Type: TABLE; Schema: public; Owner: postgres
    --

    CREATE TABLE public.migrations (
        id integer NOT NULL,
        "timestamp" bigint NOT NULL,
        name character varying NOT NULL
    );

    --
    -- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
    --

    CREATE SEQUENCE public.migrations_id_seq
        AS integer
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1;

    --
    -- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
    --

    ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


    --
    -- Name: onboarding_session_attendees; Type: TABLE; Schema: public; Owner: postgres
    --

    CREATE TABLE public.onboarding_session_attendees (
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        deleted_at timestamp with time zone,
        id text NOT NULL,
        updated_at timestamp with time zone DEFAULT now() NOT NULL,
        session_id text NOT NULL,
        student_id text NOT NULL
    );

    --
    -- Name: onboarding_sessions; Type: TABLE; Schema: public; Owner: postgres
    --

    CREATE TABLE public.onboarding_sessions (
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        deleted_at timestamp with time zone,
        id text NOT NULL,
        updated_at timestamp with time zone DEFAULT now() NOT NULL,
        date date NOT NULL,
        "group" integer NOT NULL
    );

    --
    -- Name: onboarding_sessions_group_seq; Type: SEQUENCE; Schema: public; Owner: postgres
    --

    CREATE SEQUENCE public.onboarding_sessions_group_seq
        AS integer
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1;

    --
    -- Name: onboarding_sessions_group_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
    --

    ALTER SEQUENCE public.onboarding_sessions_group_seq OWNED BY public.onboarding_sessions."group";


    --
    -- Name: one_time_codes; Type: TABLE; Schema: public; Owner: postgres
    --

    CREATE TABLE public.one_time_codes (
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        deleted_at timestamp with time zone,
        id text NOT NULL,
        updated_at timestamp with time zone DEFAULT now() NOT NULL,
        admin_id text,
        email text NOT NULL,
        purpose text NOT NULL,
        student_id text,
        value text NOT NULL
    );

    --
    -- Name: profile_views; Type: TABLE; Schema: public; Owner: postgres
    --

    CREATE TABLE public.profile_views (
        id text NOT NULL,
        profile_viewed_id text NOT NULL,
        viewed_at timestamp with time zone DEFAULT now() NOT NULL,
        viewer_id text NOT NULL
    );

    --
    -- Name: program_participants; Type: TABLE; Schema: public; Owner: postgres
    --

    CREATE TABLE public.program_participants (
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        deleted_at timestamp with time zone,
        id text NOT NULL,
        updated_at timestamp with time zone DEFAULT now() NOT NULL,
        program_id text NOT NULL,
        student_id text,
        email text
    );

    --
    -- Name: programs; Type: TABLE; Schema: public; Owner: postgres
    --

    CREATE TABLE public.programs (
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        deleted_at timestamp with time zone,
        id text NOT NULL,
        updated_at timestamp with time zone DEFAULT now() NOT NULL,
        end_date date NOT NULL,
        name text NOT NULL,
        start_date date NOT NULL
    );

    --
    -- Name: resource_users; Type: TABLE; Schema: public; Owner: postgres
    --

    CREATE TABLE public.resource_users (
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        deleted_at timestamp with time zone,
        id text NOT NULL,
        updated_at timestamp with time zone DEFAULT now() NOT NULL,
        resource_id text NOT NULL,
        student_id text,
        used_at timestamp with time zone,
        email text
    );

    --
    -- Name: resources; Type: TABLE; Schema: public; Owner: postgres
    --

    CREATE TABLE public.resources (
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        deleted_at timestamp with time zone,
        id text NOT NULL,
        updated_at timestamp with time zone DEFAULT now() NOT NULL,
        name text NOT NULL,
        status text NOT NULL
    );

    --
    -- Name: scholarship_recipients; Type: TABLE; Schema: public; Owner: postgres
    --

    CREATE TABLE public.scholarship_recipients (
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        deleted_at timestamp with time zone,
        id text NOT NULL,
        updated_at timestamp with time zone DEFAULT now() NOT NULL,
        amount integer NOT NULL,
        reason text NOT NULL,
        type text NOT NULL,
        student_id text NOT NULL,
        awarded_at timestamp with time zone NOT NULL
    );

    --
    -- Name: schools; Type: TABLE; Schema: public; Owner: postgres
    --

    CREATE TABLE public.schools (
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        deleted_at timestamp with time zone,
        id text NOT NULL,
        updated_at timestamp with time zone DEFAULT now() NOT NULL,
        address_city text NOT NULL,
        address_state text NOT NULL,
        address_zip text NOT NULL,
        name text NOT NULL,
        coordinates point
    );

    --
    -- Name: slack_channels; Type: TABLE; Schema: public; Owner: postgres
    --

    CREATE TABLE public.slack_channels (
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        deleted_at timestamp with time zone,
        id text NOT NULL,
        name text NOT NULL,
        type text NOT NULL
    );

    --
    -- Name: slack_messages; Type: TABLE; Schema: public; Owner: postgres
    --

    CREATE TABLE public.slack_messages (
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        deleted_at timestamp with time zone,
        id text NOT NULL,
        channel_id text NOT NULL,
        user_id text NOT NULL,
        text text,
        thread_id text,
        student_id text
    );

    --
    -- Name: slack_reactions; Type: TABLE; Schema: public; Owner: postgres
    --

    CREATE TABLE public.slack_reactions (
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        user_id text NOT NULL,
        message_id text NOT NULL,
        reaction text NOT NULL,
        student_id text,
        channel_id text NOT NULL
    );

    --
    -- Name: student_active_statuses; Type: TABLE; Schema: public; Owner: postgres
    --

    CREATE TABLE public.student_active_statuses (
        date date NOT NULL,
        status text NOT NULL,
        student_id text NOT NULL
    );

    --
    -- Name: student_emails; Type: TABLE; Schema: public; Owner: postgres
    --

    CREATE TABLE public.student_emails (
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        deleted_at timestamp with time zone,
        updated_at timestamp with time zone DEFAULT now() NOT NULL,
        email text NOT NULL,
        student_id text
    );

    --
    -- Name: students; Type: TABLE; Schema: public; Owner: postgres
    --

    CREATE TABLE public.students (
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        id text NOT NULL,
        updated_at timestamp with time zone DEFAULT now() NOT NULL,
        accepted_at timestamp with time zone NOT NULL,
        address_city text,
        address_line1 text,
        address_line2 text,
        address_state text,
        address_zip text,
        application_id text,
        applied_at timestamp with time zone,
        claimed_swag_pack_at timestamp with time zone,
        education_level text NOT NULL,
        email text NOT NULL,
        first_name text NOT NULL,
        gender text NOT NULL,
        gender_pronouns text,
        graduation_year text NOT NULL,
        joined_slack_at timestamp with time zone,
        last_name text NOT NULL,
        linked_in_url text,
        major text NOT NULL,
        onboarded_at timestamp with time zone,
        other_demographics text[] NOT NULL,
        other_major text,
        other_school text,
        race text[] NOT NULL,
        school_id text,
        slack_id text,
        swag_up_order_id text,
        activated_at timestamp with time zone,
        activation_requirements_completed text[] DEFAULT '{}'::text[] NOT NULL,
        number integer NOT NULL,
        preferred_name text,
        profile_picture text,
        calendly_url text,
        github_url text,
        instagram_handle text,
        personal_website_url text,
        twitter_handle text,
        headline text,
        current_location text,
        current_location_coordinates point,
        hometown text,
        hometown_coordinates point,
        joined_member_directory_at timestamp with time zone
    );

    --
    -- Name: students_number_seq; Type: SEQUENCE; Schema: public; Owner: postgres
    --

    CREATE SEQUENCE public.students_number_seq
        AS integer
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1;

    --
    -- Name: students_number_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
    --

    ALTER SEQUENCE public.students_number_seq OWNED BY public.students.number;


    --
    -- Name: survey_responses; Type: TABLE; Schema: public; Owner: postgres
    --

    CREATE TABLE public.survey_responses (
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        email text NOT NULL,
        first_name text NOT NULL,
        id text NOT NULL,
        last_name text NOT NULL,
        responded_on date NOT NULL,
        student_id text,
        survey_id text NOT NULL
    );

    --
    -- Name: surveys; Type: TABLE; Schema: public; Owner: postgres
    --

    CREATE TABLE public.surveys (
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        description text,
        event_id text,
        id text NOT NULL,
        title text NOT NULL
    );

    --
    -- Name: work_experiences; Type: TABLE; Schema: public; Owner: postgres
    --

    CREATE TABLE public.work_experiences (
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        deleted_at timestamp with time zone,
        id text NOT NULL,
        updated_at timestamp with time zone DEFAULT now() NOT NULL,
        company_id text,
        company_name text,
        end_date date,
        location_city text,
        location_state text,
        location_type text NOT NULL,
        start_date date NOT NULL,
        student_id text NOT NULL,
        title text NOT NULL,
        employment_type text NOT NULL
    );

    --
    -- Name: migrations id; Type: DEFAULT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


    --
    -- Name: onboarding_sessions group; Type: DEFAULT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.onboarding_sessions ALTER COLUMN "group" SET DEFAULT nextval('public.onboarding_sessions_group_seq'::regclass);


    --
    -- Name: students number; Type: DEFAULT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.students ALTER COLUMN number SET DEFAULT nextval('public.students_number_seq'::regclass);


    --
    -- Name: email_campaign_links PK_0069785eead914d9e38ed3e0486; Type: CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.email_campaign_links
        ADD CONSTRAINT "PK_0069785eead914d9e38ed3e0486" PRIMARY KEY (id);


    --
    -- Name: student_emails PK_02547c64dee0325548ee56025ff; Type: CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.student_emails
        ADD CONSTRAINT "PK_02547c64dee0325548ee56025ff" PRIMARY KEY (email);


    --
    -- Name: work_experiences PK_3189db15aaccc2861851ea3da17; Type: CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.work_experiences
        ADD CONSTRAINT "PK_3189db15aaccc2861851ea3da17" PRIMARY KEY (id);


    --
    -- Name: educations PK_36350278ed06e4381c2b4912956; Type: CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.educations
        ADD CONSTRAINT "PK_36350278ed06e4381c2b4912956" PRIMARY KEY (id);


    --
    -- Name: scholarship_recipients PK_401156c93c7624333d75a4d1aa6; Type: CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.scholarship_recipients
        ADD CONSTRAINT "PK_401156c93c7624333d75a4d1aa6" PRIMARY KEY (id);


    --
    -- Name: events PK_40731c7151fe4be3116e45ddf73; Type: CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.events
        ADD CONSTRAINT "PK_40731c7151fe4be3116e45ddf73" PRIMARY KEY (id);


    --
    -- Name: email_lists PK_5434f9b31ac88ee87a432b259b1; Type: CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.email_lists
        ADD CONSTRAINT "PK_5434f9b31ac88ee87a432b259b1" PRIMARY KEY (id);


    --
    -- Name: slack_reactions PK_5ng8jzb0vrri; Type: CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.slack_reactions
        ADD CONSTRAINT "PK_5ng8jzb0vrri" PRIMARY KEY (channel_id, message_id, reaction, user_id);


    --
    -- Name: student_active_statuses PK_626375e603a688a40df9e6a1ded; Type: CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.student_active_statuses
        ADD CONSTRAINT "PK_626375e603a688a40df9e6a1ded" PRIMARY KEY (date, student_id);


    --
    -- Name: resources PK_632484ab9dff41bba94f9b7c85e; Type: CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.resources
        ADD CONSTRAINT "PK_632484ab9dff41bba94f9b7c85e" PRIMARY KEY (id);


    --
    -- Name: email_campaigns PK_72bad329795785308e66d562350; Type: CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.email_campaigns
        ADD CONSTRAINT "PK_72bad329795785308e66d562350" PRIMARY KEY (id);


    --
    -- Name: students PK_7d7f07271ad4ce999880713f05e; Type: CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.students
        ADD CONSTRAINT "PK_7d7f07271ad4ce999880713f05e" PRIMARY KEY (id);


    --
    -- Name: activities PK_7f4004429f731ffb9c88eb486a8; Type: CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.activities
        ADD CONSTRAINT "PK_7f4004429f731ffb9c88eb486a8" PRIMARY KEY (id);


    --
    -- Name: program_participants PK_812f2ac865358ccaaf97a9f08db; Type: CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.program_participants
        ADD CONSTRAINT "PK_812f2ac865358ccaaf97a9f08db" PRIMARY KEY (id);


    --
    -- Name: migrations PK_8c82d7f526340ab734260ea46be; Type: CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.migrations
        ADD CONSTRAINT "PK_8c82d7f526340ab734260ea46be" PRIMARY KEY (id);


    --
    -- Name: completed_activities PK_8ccdc2a5be10feefbe7c2dd43f8; Type: CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.completed_activities
        ADD CONSTRAINT "PK_8ccdc2a5be10feefbe7c2dd43f8" PRIMARY KEY (id);


    --
    -- Name: onboarding_session_attendees PK_8d6422c2f867a2335d7a459ce10; Type: CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.onboarding_session_attendees
        ADD CONSTRAINT "PK_8d6422c2f867a2335d7a459ce10" PRIMARY KEY (id);


    --
    -- Name: applications PK_938c0a27255637bde919591888f; Type: CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.applications
        ADD CONSTRAINT "PK_938c0a27255637bde919591888f" PRIMARY KEY (id);


    --
    -- Name: onboarding_sessions PK_9553e455cbfe1aeebc6f43ae379; Type: CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.onboarding_sessions
        ADD CONSTRAINT "PK_9553e455cbfe1aeebc6f43ae379" PRIMARY KEY (id);


    --
    -- Name: schools PK_95b932e47ac129dd8e23a0db548; Type: CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.schools
        ADD CONSTRAINT "PK_95b932e47ac129dd8e23a0db548" PRIMARY KEY (id);


    --
    -- Name: slack_channels PK_9966694c91c805a3461d5b6f979; Type: CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.slack_channels
        ADD CONSTRAINT "PK_9966694c91c805a3461d5b6f979" PRIMARY KEY (id);


    --
    -- Name: one_time_codes PK_ae6fc30aa12eeae02fec8d6b63e; Type: CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.one_time_codes
        ADD CONSTRAINT "PK_ae6fc30aa12eeae02fec8d6b63e" PRIMARY KEY (id);


    --
    -- Name: resource_users PK_c7f28147fbfc9d54240aeb95815; Type: CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.resource_users
        ADD CONSTRAINT "PK_c7f28147fbfc9d54240aeb95815" PRIMARY KEY (id);


    --
    -- Name: slack_messages PK_cgnvg61wr16b; Type: CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.slack_messages
        ADD CONSTRAINT "PK_cgnvg61wr16b" PRIMARY KEY (channel_id, id);


    --
    -- Name: email_campaign_opens PK_d1afc92f28b86e8ab2563eb4f61; Type: CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.email_campaign_opens
        ADD CONSTRAINT "PK_d1afc92f28b86e8ab2563eb4f61" PRIMARY KEY (id);


    --
    -- Name: email_campaign_clicks PK_d3beb0d07a8e4e490cbfc4bf328; Type: CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.email_campaign_clicks
        ADD CONSTRAINT "PK_d3beb0d07a8e4e490cbfc4bf328" PRIMARY KEY (id);


    --
    -- Name: programs PK_d43c664bcaafc0e8a06dfd34e05; Type: CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.programs
        ADD CONSTRAINT "PK_d43c664bcaafc0e8a06dfd34e05" PRIMARY KEY (id);


    --
    -- Name: companies PK_d4bc3e82a314fa9e29f652c2c22; Type: CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.companies
        ADD CONSTRAINT "PK_d4bc3e82a314fa9e29f652c2c22" PRIMARY KEY (id);


    --
    -- Name: admins PK_e3b38270c97a854c48d2e80874e; Type: CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.admins
        ADD CONSTRAINT "PK_e3b38270c97a854c48d2e80874e" PRIMARY KEY (id);


    --
    -- Name: event_attendees PK_w2fq46mtaves; Type: CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.event_attendees
        ADD CONSTRAINT "PK_w2fq46mtaves" PRIMARY KEY (email, event_id);


    --
    -- Name: event_registrations PK_w4kq002onr1g; Type: CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.event_registrations
        ADD CONSTRAINT "PK_w4kq002onr1g" PRIMARY KEY (email, event_id);


    --
    -- Name: admins UQ_051db7d37d478a69a7432df1479; Type: CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.admins
        ADD CONSTRAINT "UQ_051db7d37d478a69a7432df1479" UNIQUE (email);


    --
    -- Name: completed_activities UQ_1keak785y8o9; Type: CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.completed_activities
        ADD CONSTRAINT "UQ_1keak785y8o9" UNIQUE (event_attended, student_id);


    --
    -- Name: students UQ_25985d58c714a4a427ced57507b; Type: CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.students
        ADD CONSTRAINT "UQ_25985d58c714a4a427ced57507b" UNIQUE (email);


    --
    -- Name: companies UQ_3212cc5ff994a44d966e00f1102; Type: CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.companies
        ADD CONSTRAINT "UQ_3212cc5ff994a44d966e00f1102" UNIQUE (crunchbase_id);


    --
    -- Name: schools UQ_32fbaf4feccea51ef7aeefa62bb; Type: CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.schools
        ADD CONSTRAINT "UQ_32fbaf4feccea51ef7aeefa62bb" UNIQUE (name);


    --
    -- Name: event_attendees UQ_9d32xlhph8j7; Type: CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.event_attendees
        ADD CONSTRAINT "UQ_9d32xlhph8j7" UNIQUE (student_id, event_id);


    --
    -- Name: students UQ_a23ab2db471b068703d857917ad; Type: CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.students
        ADD CONSTRAINT "UQ_a23ab2db471b068703d857917ad" UNIQUE (slack_id);


    --
    -- Name: completed_activities UQ_dkl1vdbp1v87; Type: CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.completed_activities
        ADD CONSTRAINT "UQ_dkl1vdbp1v87" UNIQUE (channel_id, thread_replied_to, student_id);


    --
    -- Name: completed_activities UQ_hu3bfyzq31aq; Type: CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.completed_activities
        ADD CONSTRAINT "UQ_hu3bfyzq31aq" UNIQUE (channel_id, message_reacted_to, student_id);


    --
    -- Name: event_registrations UQ_j5tvjlqsyvqd; Type: CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.event_registrations
        ADD CONSTRAINT "UQ_j5tvjlqsyvqd" UNIQUE (event_id, student_id);


    --
    -- Name: countries countries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.countries
        ADD CONSTRAINT countries_pkey PRIMARY KEY (code);


    --
    -- Name: icebreaker_prompts icebreaker_prompts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.icebreaker_prompts
        ADD CONSTRAINT icebreaker_prompts_pkey PRIMARY KEY (id);


    --
    -- Name: icebreaker_responses icebreaker_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.icebreaker_responses
        ADD CONSTRAINT icebreaker_responses_pkey PRIMARY KEY (id);


    --
    -- Name: icebreaker_responses icebreaker_responses_prompt_id_student_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.icebreaker_responses
        ADD CONSTRAINT icebreaker_responses_prompt_id_student_id_key UNIQUE (prompt_id, student_id);

    --
    -- Name: member_ethnicities member_ethnicities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.member_ethnicities
        ADD CONSTRAINT member_ethnicities_pkey PRIMARY KEY (country_code, student_id);


    --
    -- Name: profile_views profile_views_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.profile_views
        ADD CONSTRAINT profile_views_pkey PRIMARY KEY (id);


    --
    -- Name: program_participants program_participants_email_program_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.program_participants
        ADD CONSTRAINT program_participants_email_program_id_key UNIQUE (email, program_id);


    --
    -- Name: resource_users resource_users_email_resource_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.resource_users
        ADD CONSTRAINT resource_users_email_resource_id_key UNIQUE (email, resource_id);


    --
    -- Name: survey_responses survey_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.survey_responses
        ADD CONSTRAINT survey_responses_pkey PRIMARY KEY (id);


    --
    -- Name: surveys surveys_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.surveys
        ADD CONSTRAINT surveys_pkey PRIMARY KEY (id);


    --
    -- Name: survey_responses uq_aoq88oc8eaex; Type: CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.survey_responses
        ADD CONSTRAINT uq_aoq88oc8eaex UNIQUE (student_id, survey_id);


    --
    -- Name: survey_responses uq_oy0aq901k8hd; Type: CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.survey_responses
        ADD CONSTRAINT uq_oy0aq901k8hd UNIQUE (email, survey_id);


    --
    -- Name: completed_activities uq_uxq5qa94nscl; Type: CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.completed_activities
        ADD CONSTRAINT uq_uxq5qa94nscl UNIQUE (student_id, survey_responded_to);


    --
    -- Name: IDX_0d268fc05202a7001a97acbec6; Type: INDEX; Schema: public; Owner: postgres
    --

    CREATE INDEX "IDX_0d268fc05202a7001a97acbec6" ON public.email_campaign_links USING btree (campaign_id);


    --
    -- Name: IDX_0m1j8gf4jcob; Type: INDEX; Schema: public; Owner: postgres
    --

    CREATE UNIQUE INDEX "IDX_0m1j8gf4jcob" ON public.completed_activities USING btree (student_id, type) WHERE (type = 'upload_profile_picture'::text);


    --
    -- Name: IDX_18ade916f4d282e0569af931f8; Type: INDEX; Schema: public; Owner: postgres
    --

    CREATE INDEX "IDX_18ade916f4d282e0569af931f8" ON public.event_attendees USING btree (student_id);


    --
    -- Name: IDX_26eac4de832305aa86593c04f4; Type: INDEX; Schema: public; Owner: postgres
    --

    CREATE UNIQUE INDEX "IDX_26eac4de832305aa86593c04f4" ON public.email_campaign_opens USING btree (campaign_id, opened_at, student_id);


    --
    -- Name: IDX_36c51b6c73fe30f5e5c6f17311; Type: INDEX; Schema: public; Owner: postgres
    --

    CREATE UNIQUE INDEX "IDX_36c51b6c73fe30f5e5c6f17311" ON public.email_campaign_clicks USING btree (campaign_id, link_id, clicked_at, student_id);


    --
    -- Name: IDX_3eff6f5ff06a40289cb3043aad; Type: INDEX; Schema: public; Owner: postgres
    --

    CREATE INDEX "IDX_3eff6f5ff06a40289cb3043aad" ON public.email_campaign_opens USING btree (student_id);


    --
    -- Name: IDX_51114950b0357f1553aa50a286; Type: INDEX; Schema: public; Owner: postgres
    --

    CREATE UNIQUE INDEX "IDX_51114950b0357f1553aa50a286" ON public.slack_reactions USING btree (message_id, student_id, reaction);


    --
    -- Name: IDX_7f842b2e8b974cd534c73f9201; Type: INDEX; Schema: public; Owner: postgres
    --

    CREATE UNIQUE INDEX "IDX_7f842b2e8b974cd534c73f9201" ON public.email_campaign_links USING btree (campaign_id, url);


    --
    -- Name: IDX_862ba95e551ed267529bb8ad6a; Type: INDEX; Schema: public; Owner: postgres
    --

    CREATE INDEX "IDX_862ba95e551ed267529bb8ad6a" ON public.email_campaign_clicks USING btree (campaign_id);


    --
    -- Name: IDX_a481b5eff9cb1ec9fbd809c49c; Type: INDEX; Schema: public; Owner: postgres
    --

    CREATE INDEX "IDX_a481b5eff9cb1ec9fbd809c49c" ON public.student_active_statuses USING btree (student_id);


    --
    -- Name: IDX_a98wx9mszfw0; Type: INDEX; Schema: public; Owner: postgres
    --

    CREATE INDEX "IDX_a98wx9mszfw0" ON public.completed_activities USING btree (student_id);


    --
    -- Name: IDX_ba45cb3020365126402d989431; Type: INDEX; Schema: public; Owner: postgres
    --

    CREATE UNIQUE INDEX "IDX_ba45cb3020365126402d989431" ON public.onboarding_session_attendees USING btree (session_id, student_id);


    --
    -- Name: IDX_ba50d0f7b68ee5b73f7e7b8fdf; Type: INDEX; Schema: public; Owner: postgres
    --

    CREATE UNIQUE INDEX "IDX_ba50d0f7b68ee5b73f7e7b8fdf" ON public.programs USING btree (name);


    --
    -- Name: IDX_c4cb735fac413057e9048b51ec; Type: INDEX; Schema: public; Owner: postgres
    --

    CREATE UNIQUE INDEX "IDX_c4cb735fac413057e9048b51ec" ON public.resource_users USING btree (resource_id, student_id);


    --
    -- Name: IDX_cb8365260639d4ff2adec365f7; Type: INDEX; Schema: public; Owner: postgres
    --

    CREATE UNIQUE INDEX "IDX_cb8365260639d4ff2adec365f7" ON public.email_campaign_clicks USING btree (campaign_id, link_id, clicked_at, email);


    --
    -- Name: IDX_e9dd2cd0ea65030b580faded74; Type: INDEX; Schema: public; Owner: postgres
    --

    CREATE INDEX "IDX_e9dd2cd0ea65030b580faded74" ON public.email_campaign_opens USING btree (campaign_id);


    --
    -- Name: IDX_f276c867b5752b7cc2c6c797b2; Type: INDEX; Schema: public; Owner: postgres
    --

    CREATE UNIQUE INDEX "IDX_f276c867b5752b7cc2c6c797b2" ON public.resources USING btree (name);


    --
    -- Name: IDX_f31b366f6f638b8bcef707e8b2; Type: INDEX; Schema: public; Owner: postgres
    --

    CREATE UNIQUE INDEX "IDX_f31b366f6f638b8bcef707e8b2" ON public.email_campaign_opens USING btree (campaign_id, opened_at, email);


    --
    -- Name: IDX_f445685cf399095c8faf4a6fdb; Type: INDEX; Schema: public; Owner: postgres
    --

    CREATE UNIQUE INDEX "IDX_f445685cf399095c8faf4a6fdb" ON public.program_participants USING btree (program_id, student_id);


    --
    -- Name: IDX_ff31bb932552a9a6fe61299350; Type: INDEX; Schema: public; Owner: postgres
    --

    CREATE INDEX "IDX_ff31bb932552a9a6fe61299350" ON public.email_campaign_clicks USING btree (student_id);


    --
    -- Name: IDX_n0rlsilgnwue; Type: INDEX; Schema: public; Owner: postgres
    --

    CREATE INDEX "IDX_n0rlsilgnwue" ON public.students USING btree (school_id);


    --
    -- Name: IDX_xw6v9c9h9doq; Type: INDEX; Schema: public; Owner: postgres
    --

    CREATE UNIQUE INDEX "IDX_xw6v9c9h9doq" ON public.completed_activities USING btree (student_id, type) WHERE (type = 'get_activated'::text);


    --
    -- Name: idx_7q4xebf9marc; Type: INDEX; Schema: public; Owner: postgres
    --

    CREATE UNIQUE INDEX idx_7q4xebf9marc ON public.completed_activities USING btree (student_id, type) WHERE (type = 'join_member_directory'::text);


    --
    -- Name: slack_messages_student_id_idx; Type: INDEX; Schema: public; Owner: postgres
    --

    CREATE INDEX slack_messages_student_id_idx ON public.slack_messages USING btree (student_id);


    --
    -- Name: slack_reactions_student_id_idx; Type: INDEX; Schema: public; Owner: postgres
    --

    CREATE INDEX slack_reactions_student_id_idx ON public.slack_reactions USING btree (student_id);


    --
    -- Name: student_active_statuses_student_id_status_date_idx; Type: INDEX; Schema: public; Owner: postgres
    --

    CREATE INDEX student_active_statuses_student_id_status_date_idx ON public.student_active_statuses USING btree (student_id, status, date DESC);


    --
    -- Name: completed_activities FK_0140c854ae5304f6546171332b6; Type: FK CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.completed_activities
        ADD CONSTRAINT "FK_0140c854ae5304f6546171332b6" FOREIGN KEY (activity_id) REFERENCES public.activities(id);


    --
    -- Name: email_campaign_clicks FK_01e6991497a0b070a89f6bcb4bf; Type: FK CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.email_campaign_clicks
        ADD CONSTRAINT "FK_01e6991497a0b070a89f6bcb4bf" FOREIGN KEY (link_id) REFERENCES public.email_campaign_links(id);


    --
    -- Name: email_campaign_links FK_0d268fc05202a7001a97acbec6b; Type: FK CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.email_campaign_links
        ADD CONSTRAINT "FK_0d268fc05202a7001a97acbec6b" FOREIGN KEY (campaign_id) REFERENCES public.email_campaigns(id);


    --
    -- Name: event_attendees FK_18ade916f4d282e0569af931f83; Type: FK CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.event_attendees
        ADD CONSTRAINT "FK_18ade916f4d282e0569af931f83" FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE SET NULL;


    --
    -- Name: students FK_25985d58c714a4a427ced57507b; Type: FK CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.students
        ADD CONSTRAINT "FK_25985d58c714a4a427ced57507b" FOREIGN KEY (email) REFERENCES public.student_emails(email);


    --
    -- Name: applications FK_268c174013ce6952213dd2e3c2e; Type: FK CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.applications
        ADD CONSTRAINT "FK_268c174013ce6952213dd2e3c2e" FOREIGN KEY (school_id) REFERENCES public.schools(id);


    --
    -- Name: work_experiences FK_3808b5a5551cc1296d1ae61ce9c; Type: FK CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.work_experiences
        ADD CONSTRAINT "FK_3808b5a5551cc1296d1ae61ce9c" FOREIGN KEY (company_id) REFERENCES public.companies(id);


    --
    -- Name: one_time_codes FK_384dfee27fef0a012f440a45b5b; Type: FK CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.one_time_codes
        ADD CONSTRAINT "FK_384dfee27fef0a012f440a45b5b" FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


    --
    -- Name: slack_messages FK_3e1cccaa310435f7572a4e3bd6e; Type: FK CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.slack_messages
        ADD CONSTRAINT "FK_3e1cccaa310435f7572a4e3bd6e" FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE SET NULL;


    --
    -- Name: email_campaign_opens FK_3eff6f5ff06a40289cb3043aadd; Type: FK CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.email_campaign_opens
        ADD CONSTRAINT "FK_3eff6f5ff06a40289cb3043aadd" FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE SET NULL;


    --
    -- Name: work_experiences FK_52b1e7a2b8965b1e9479ebffd62; Type: FK CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.work_experiences
        ADD CONSTRAINT "FK_52b1e7a2b8965b1e9479ebffd62" FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


    --
    -- Name: completed_activities FK_584a13934be81dd51e5d2c14d60; Type: FK CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.completed_activities
        ADD CONSTRAINT "FK_584a13934be81dd51e5d2c14d60" FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


    --
    -- Name: resource_users FK_5cca18dab247ece1379c21a4253; Type: FK CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.resource_users
        ADD CONSTRAINT "FK_5cca18dab247ece1379c21a4253" FOREIGN KEY (resource_id) REFERENCES public.resources(id);


    --
    -- Name: educations FK_6645bc400ae3486b7182fb36e3f; Type: FK CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.educations
        ADD CONSTRAINT "FK_6645bc400ae3486b7182fb36e3f" FOREIGN KEY (school_id) REFERENCES public.schools(id);


    --
    -- Name: resource_users FK_69f79a37afc88e975ac3d0cde42; Type: FK CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.resource_users
        ADD CONSTRAINT "FK_69f79a37afc88e975ac3d0cde42" FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE SET NULL;


    --
    -- Name: applications FK_7b8cdcaabacb80df1ed8f7dbbea; Type: FK CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.applications
        ADD CONSTRAINT "FK_7b8cdcaabacb80df1ed8f7dbbea" FOREIGN KEY (reviewed_by_id) REFERENCES public.admins(id);


    --
    -- Name: email_campaign_clicks FK_862ba95e551ed267529bb8ad6a5; Type: FK CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.email_campaign_clicks
        ADD CONSTRAINT "FK_862ba95e551ed267529bb8ad6a5" FOREIGN KEY (campaign_id) REFERENCES public.email_campaigns(id);


    --
    -- Name: event_attendees FK_8f6qydm8w4d9; Type: FK CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.event_attendees
        ADD CONSTRAINT "FK_8f6qydm8w4d9" FOREIGN KEY (event_id) REFERENCES public.events(id);


    --
    -- Name: program_participants FK_965fe2c3b348678f5494b6ad958; Type: FK CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.program_participants
        ADD CONSTRAINT "FK_965fe2c3b348678f5494b6ad958" FOREIGN KEY (program_id) REFERENCES public.programs(id);


    --
    -- Name: educations FK_9e4fe4a0c54edfb14240310f7f7; Type: FK CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.educations
        ADD CONSTRAINT "FK_9e4fe4a0c54edfb14240310f7f7" FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


    --
    -- Name: student_active_statuses FK_a481b5eff9cb1ec9fbd809c49c9; Type: FK CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.student_active_statuses
        ADD CONSTRAINT "FK_a481b5eff9cb1ec9fbd809c49c9" FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


    --
    -- Name: students FK_aa8edc7905ad764f85924569647; Type: FK CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.students
        ADD CONSTRAINT "FK_aa8edc7905ad764f85924569647" FOREIGN KEY (school_id) REFERENCES public.schools(id);


    --
    -- Name: students FK_b3bc610967da06de7b140494c7b; Type: FK CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.students
        ADD CONSTRAINT "FK_b3bc610967da06de7b140494c7b" FOREIGN KEY (application_id) REFERENCES public.applications(id);


    --
    -- Name: one_time_codes FK_b7934bebe662bc7d70138e71cef; Type: FK CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.one_time_codes
        ADD CONSTRAINT "FK_b7934bebe662bc7d70138e71cef" FOREIGN KEY (admin_id) REFERENCES public.admins(id);


    --
    -- Name: email_campaigns FK_ba34bdeebfa85d35a5e3953dc78; Type: FK CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.email_campaigns
        ADD CONSTRAINT "FK_ba34bdeebfa85d35a5e3953dc78" FOREIGN KEY (list_id) REFERENCES public.email_lists(id);


    --
    -- Name: onboarding_session_attendees FK_bf1323140d7698f91ff21bb9a01; Type: FK CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.onboarding_session_attendees
        ADD CONSTRAINT "FK_bf1323140d7698f91ff21bb9a01" FOREIGN KEY (session_id) REFERENCES public.onboarding_sessions(id);


    --
    -- Name: student_emails FK_c868fb36612a0e7110aae3e265a; Type: FK CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.student_emails
        ADD CONSTRAINT "FK_c868fb36612a0e7110aae3e265a" FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


    --
    -- Name: program_participants FK_cb8c4f8b4567856155df7a54c88; Type: FK CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.program_participants
        ADD CONSTRAINT "FK_cb8c4f8b4567856155df7a54c88" FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE SET NULL;


    --
    -- Name: slack_messages FK_doj63hsxt11w; Type: FK CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.slack_messages
        ADD CONSTRAINT "FK_doj63hsxt11w" FOREIGN KEY (channel_id) REFERENCES public.slack_channels(id);


    --
    -- Name: scholarship_recipients FK_e7d02c87af4a039ee9ae54b803c; Type: FK CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.scholarship_recipients
        ADD CONSTRAINT "FK_e7d02c87af4a039ee9ae54b803c" FOREIGN KEY (student_id) REFERENCES public.students(id);


    --
    -- Name: onboarding_session_attendees FK_e973d14344e5b73a9d3e20b717f; Type: FK CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.onboarding_session_attendees
        ADD CONSTRAINT "FK_e973d14344e5b73a9d3e20b717f" FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


    --
    -- Name: email_campaign_opens FK_e9dd2cd0ea65030b580faded745; Type: FK CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.email_campaign_opens
        ADD CONSTRAINT "FK_e9dd2cd0ea65030b580faded745" FOREIGN KEY (campaign_id) REFERENCES public.email_campaigns(id);


    --
    -- Name: slack_reactions FK_fa25662801e3a7cf0062d0b7009; Type: FK CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.slack_reactions
        ADD CONSTRAINT "FK_fa25662801e3a7cf0062d0b7009" FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE SET NULL;


    --
    -- Name: email_campaign_clicks FK_ff31bb932552a9a6fe61299350e; Type: FK CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.email_campaign_clicks
        ADD CONSTRAINT "FK_ff31bb932552a9a6fe61299350e" FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE SET NULL;


    --
    -- Name: completed_activities FK_mrbv401qw438; Type: FK CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.completed_activities
        ADD CONSTRAINT "FK_mrbv401qw438" FOREIGN KEY (channel_id, message_reacted_to) REFERENCES public.slack_messages(channel_id, id) ON DELETE CASCADE;


    --
    -- Name: slack_reactions FK_pgm1oozls356; Type: FK CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.slack_reactions
        ADD CONSTRAINT "FK_pgm1oozls356" FOREIGN KEY (channel_id, message_id) REFERENCES public.slack_messages(channel_id, id) ON DELETE CASCADE;


    --
    -- Name: slack_messages FK_w6029u2uo4kh; Type: FK CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.slack_messages
        ADD CONSTRAINT "FK_w6029u2uo4kh" FOREIGN KEY (channel_id, thread_id) REFERENCES public.slack_messages(channel_id, id);


    --
    -- Name: slack_reactions FK_wkqtysz0eb3b; Type: FK CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.slack_reactions
        ADD CONSTRAINT "FK_wkqtysz0eb3b" FOREIGN KEY (channel_id) REFERENCES public.slack_channels(id);


    --
    -- Name: completed_activities FK_y7q0nggl9ag6; Type: FK CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.completed_activities
        ADD CONSTRAINT "FK_y7q0nggl9ag6" FOREIGN KEY (event_attended) REFERENCES public.events(id) ON DELETE CASCADE;


    --
    -- Name: completed_activities FK_z76csrquvzq1; Type: FK CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.completed_activities
        ADD CONSTRAINT "FK_z76csrquvzq1" FOREIGN KEY (channel_id, thread_replied_to) REFERENCES public.slack_messages(channel_id, id) ON DELETE CASCADE;


    --
    -- Name: completed_activities completed_activities_survey_responded_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.completed_activities
        ADD CONSTRAINT completed_activities_survey_responded_to_fkey FOREIGN KEY (survey_responded_to) REFERENCES public.surveys(id) ON DELETE CASCADE;


    --
    -- Name: event_registrations event_registrations_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.event_registrations
        ADD CONSTRAINT event_registrations_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id);


    --
    -- Name: event_registrations event_registrations_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.event_registrations
        ADD CONSTRAINT event_registrations_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id);


    --
    -- Name: icebreaker_responses icebreaker_responses_prompt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.icebreaker_responses
        ADD CONSTRAINT icebreaker_responses_prompt_id_fkey FOREIGN KEY (prompt_id) REFERENCES public.icebreaker_prompts(id);


    --
    -- Name: icebreaker_responses icebreaker_responses_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.icebreaker_responses
        ADD CONSTRAINT icebreaker_responses_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id);


    --
    -- Name: member_ethnicities member_ethnicities_country_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.member_ethnicities
        ADD CONSTRAINT member_ethnicities_country_code_fkey FOREIGN KEY (country_code) REFERENCES public.countries(code);


    --
    -- Name: member_ethnicities member_ethnicities_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.member_ethnicities
        ADD CONSTRAINT member_ethnicities_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id);


    --
    -- Name: profile_views profile_views_profile_viewed_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.profile_views
        ADD CONSTRAINT profile_views_profile_viewed_id_fkey FOREIGN KEY (profile_viewed_id) REFERENCES public.students(id);


    --
    -- Name: profile_views profile_views_viewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.profile_views
        ADD CONSTRAINT profile_views_viewer_id_fkey FOREIGN KEY (viewer_id) REFERENCES public.students(id);


    --
    -- Name: survey_responses survey_responses_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.survey_responses
        ADD CONSTRAINT survey_responses_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE SET NULL;


    --
    -- Name: survey_responses survey_responses_survey_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.survey_responses
        ADD CONSTRAINT survey_responses_survey_id_fkey FOREIGN KEY (survey_id) REFERENCES public.surveys(id);


    --
    -- Name: surveys surveys_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
    --

    ALTER TABLE ONLY public.surveys
        ADD CONSTRAINT surveys_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL;


    --
    -- PostgreSQL database dump complete
    --
    `.execute(db);
}

export async function down(_: Kysely<any>) {}
