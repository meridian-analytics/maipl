# Create namespace
resource "kubernetes_namespace" "minio_tenant" {
  metadata {
    name = "minio-tenant"
  }
}

# Create MinIO tenant
resource "kubectl_manifest" "minio_tenant" {
  yaml_body = <<-YAML
    apiVersion: minio.min.io/v2
    kind: Tenant
    metadata:
      name: minio-test
      namespace: minio-tenant
    spec:
      pools:
      - servers: 4
        volumesPerServer: 4
        volumeClaimTemplate:
          spec:
            storageClassName: microk8s-hostpath
            accessModes:
              - ReadWriteOnce
            resources:
              requests:
                storage: 1Gi
  YAML
}