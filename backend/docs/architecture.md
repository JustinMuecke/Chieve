[ Vite + React Frontend ]
                                         │
                                         ▼
                            [ API Gateway / Proxy ]
                            (Nginx)
                                         │
             ┌───────────────────────────┴───────────────────────────┐
             ▼                                                       ▼
   [ User/Auth Service ]                                  [ Achievement Service ]
        (FastAPI)                                                (FastAPI)
             │                                                       │
             ▼                                      ┌────────────────┴────────────────┐
        [ Postgres ]                                ▼                                 ▼
      (User Accounts,                         [ Postgres ]                     [ Redis Cache ]
     Linked Accounts,                         (Game Schema,                   (API Responses,
       GitHub OAuth)                        Achievements, User              Rate Limit Buckets,
                                           Profile Stats Cache,               Celery Broker)
                                           Materialized Views)                        │
                                                    │                                 │
                                                    ▼                                 ▼
                                            [ Message Queue ] ◄───────────────────────┘
                                           (Redis or RabbitMQ)
                                                    │
                                                    ▼
                                           [ Celery Worker(s) ]
                                            (Background Tasks)
                                                    │
                                                    ▼
                               ┌────────────────────┴────────────────────┐
                               ▼                                         ▼
                     [ GitHub OAuth API ]                      [ Steam Web API ]
                      (User Authentication)                 (OpenID 2.0 & game data)