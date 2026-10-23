pipeline {
  agent any

  options {
    timestamps()
    buildDiscarder(logRotator(numToKeepStr: '20'))
    disableConcurrentBuilds()
  }

  environment {
    COMPOSE      = 'docker compose'
    COMPOSE_PRJ  = 'simp-barang-ruang-kendaraan'
    VAULT_URL = 'https://vault.kemenagsleman.id'
    VAULT_PATH = 'kv/data/simp-barang-ruang-kendaraan'
    ENV_FILE     = '.env'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }
    
   stage('SonarQube Scan') {
      when { branch 'main' }
      steps {
        script {
          def scannerHome = tool 'sonar-scanner'
          withCredentials([
            string(credentialsId: 'sonarqube-token', variable: 'SONAR_TOKEN')
          ]) {
            withSonarQubeEnv('sonarqube') {
              sh """
                bash -lc '
                  set -euo pipefail

                  echo "[INFO] Sonar scan on branch: ${BRANCH_NAME}"
                  echo "[INFO] Using SonarScanner at: ${scannerHome}"

                  [ -f sonar-project.properties ] || {
                    echo "[ERROR] sonar-project.properties tidak ditemukan"
                    exit 1
                  }

                  "${scannerHome}/bin/sonar-scanner" \
                    -Dsonar.login="$SONAR_TOKEN"
                '
              """
            }
          }
        }
      }
    }

    stage('Fetch secrets from Vault') {
      steps {
        withCredentials([
          string(credentialsId: 'vault-token', variable: 'VAULT_TOKEN')
        ]) {
          sh '''
            bash -lc '
              set -euo pipefail

              if [ -d "$ENV_FILE" ]; then
                echo "[WARN] $ENV_FILE adalah direktori, hapus dulu lalu tulis ulang"
                rm -rf "$ENV_FILE"
              fi

              CODE=$(curl -sS -o /dev/null -w "%{http_code}" \
                     -H "X-Vault-Token: $VAULT_TOKEN" \
                     "$VAULT_URL/v1/$VAULT_PATH" || true)

              echo "[INFO] Vault check: $VAULT_URL/v1/$VAULT_PATH -> HTTP $CODE"

              [ "$CODE" = "200" ] || {
                echo "[ERROR] Vault path/token salah (HTTP $CODE)"
                exit 1
              }

              curl -sS \
                -H "X-Vault-Token: $VAULT_TOKEN" \
                "$VAULT_URL/v1/$VAULT_PATH" \
                | jq -r ".data.data | to_entries[] | \\"\\(.key)=\\(.value)\\"" \
                > "$ENV_FILE"

              if [ -d "$ENV_FILE" ]; then
                echo "[ERROR] $ENV_FILE adalah direktori (seharusnya file). Hentikan."
                exit 1
              fi

              [ -s "$ENV_FILE" ] || {
                echo "[ERROR] $ENV_FILE kosong/ga kebaca"
                exit 1
              }

              echo "[INFO] $ENV_FILE generated ($(wc -l < "$ENV_FILE") keys)"
            '
          '''
        }
      }
    }

    stage('Prepare Volumes') {
      steps {
        sh '''
          bash -lc '
            set -eu

            for v in simp-barang-ruang-kendaraan_storage simp-barang-ruang-kendaraan_logs simp-barang-ruang-kendaraan_bootstrap; do
              docker volume inspect "$v" >/dev/null 2>&1 || \
                docker volume create "$v" >/dev/null
            done
          '
        '''
      }
    }

    stage('Build Image') {
      steps {
        sh '''
          bash -lc '
            set -euo pipefail

            export HOST_PWD="$(pwd)"

            ${COMPOSE} \
              --project-directory "$HOST_PWD" \
              -p ${COMPOSE_PRJ} \
              -f docker-compose.yml \
              build app
          '
        '''
      }
    }

    stage('Restart App') {
      steps {
        sh '''
          bash -lc '
            set -euo pipefail

            export HOST_PWD="$(pwd)"

            ${COMPOSE} \
              --project-directory "$HOST_PWD" \
              -p ${COMPOSE_PRJ} \
              -f docker-compose.yml \
              up -d --no-deps --force-recreate --remove-orphans app

            CID=$(
              ${COMPOSE} \
                --project-directory "$HOST_PWD" \
                -p ${COMPOSE_PRJ} \
                -f docker-compose.yml \
                ps -q app || true
            )

            if [ -n "$CID" ]; then
              docker ps --filter "id=$CID" || true
              docker inspect -f "{{json .Mounts}}" "$CID" | jq . || true
              docker logs --tail=80 "$CID" || true
            else
              echo "[WARN] Container ID untuk service app tidak ditemukan"
            fi
          '
        '''
      }
    }

    stage('Health Check') {
      steps {
        sh '''
          bash -lc '
            set -euo pipefail

            sleep 3

            export HOST_PWD="$(pwd)"

            CID=$(
              ${COMPOSE} \
                --project-directory "$HOST_PWD" \
                -p ${COMPOSE_PRJ} \
                -f docker-compose.yml \
                ps -q app
            )

            if [ -z "$CID" ]; then
              echo "[ERROR] app container tidak ditemukan"
              exit 1
            fi

            if [ "$(docker inspect -f "{{.State.Running}}" "$CID" 2>/dev/null)" != "true" ]; then
              echo "[ERROR] app tidak running"
              exit 1
            fi

            echo "[OK] app running (CID=$CID)"
          ' 
        '''
      }
    }
  }

  post {
    success {
      echo 'Deploy OK — aplikasi simp-barang-ruang-kendaraan berhasil dijalankan.'
    }

    failure {
      echo 'Build gagal. Cek stage merah (Vault/Build/Restart/Health).'
    }
  }
}
