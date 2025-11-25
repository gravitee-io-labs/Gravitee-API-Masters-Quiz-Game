#!/bin/bash
set -e

# Configuration
REGISTRY="dobl1"
TAG="${1:-1.0}"
NAMESPACE="quiz-game"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${BLUE}==>${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

usage() {
    echo "Usage: $0 [TAG] [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --build-only     Only build Docker images, don't push or deploy"
    echo "  --push-only      Only push Docker images (assumes already built)"
    echo "  --deploy-only    Only deploy to Kubernetes (assumes images exist)"
    echo "  --no-deploy      Build and push, but don't deploy"
    echo "  --help           Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0               # Build, push, and deploy with tag 1.0"
    echo "  $0 2.0           # Build, push, and deploy with tag 2.0"
    echo "  $0 1.1 --no-deploy  # Build and push only"
    echo "  $0 --deploy-only    # Deploy existing images"
}

# Parse arguments
BUILD=true
PUSH=true
DEPLOY=true

for arg in "$@"; do
    case $arg in
        --build-only)
            PUSH=false
            DEPLOY=false
            ;;
        --push-only)
            BUILD=false
            DEPLOY=false
            ;;
        --deploy-only)
            BUILD=false
            PUSH=false
            ;;
        --no-deploy)
            DEPLOY=false
            ;;
        --help)
            usage
            exit 0
            ;;
        *)
            if [[ ! $arg == --* ]]; then
                TAG="$arg"
            fi
            ;;
    esac
done

echo ""
echo "=========================================="
echo "  Quiz Game Deployment Script"
echo "=========================================="
echo "  Registry: $REGISTRY"
echo "  Tag: $TAG"
echo "  Build: $BUILD | Push: $PUSH | Deploy: $DEPLOY"
echo "=========================================="
echo ""

# Build Docker images
if [ "$BUILD" = true ]; then
    print_step "Building Docker images for linux/amd64..."
    
    echo ""
    print_step "Building backend..."
    docker build --platform linux/amd64 -t $REGISTRY/quiz-backend:$TAG -f backend/Dockerfile ./backend
    print_success "Backend image built"
    
    print_step "Building game-client..."
    docker build --platform linux/amd64 -t $REGISTRY/quiz-game-client:$TAG -f game-client/Dockerfile .
    print_success "Game client image built"
    
    print_step "Building admin-console..."
    docker build --platform linux/amd64 -t $REGISTRY/quiz-admin-console:$TAG -f admin-console/Dockerfile .
    print_success "Admin console image built"
    
    print_step "Building scoreboard..."
    docker build --platform linux/amd64 -t $REGISTRY/quiz-scoreboard:$TAG -f scoreboard/Dockerfile .
    print_success "Scoreboard image built"
    
    echo ""
    print_success "All images built successfully!"
fi

# Push Docker images
if [ "$PUSH" = true ]; then
    echo ""
    print_step "Pushing images to Docker Hub..."
    
    docker push $REGISTRY/quiz-backend:$TAG
    print_success "Backend pushed"
    
    docker push $REGISTRY/quiz-game-client:$TAG
    print_success "Game client pushed"
    
    docker push $REGISTRY/quiz-admin-console:$TAG
    print_success "Admin console pushed"
    
    docker push $REGISTRY/quiz-scoreboard:$TAG
    print_success "Scoreboard pushed"
    
    echo ""
    print_success "All images pushed successfully!"
fi

# Deploy to Kubernetes
if [ "$DEPLOY" = true ]; then
    echo ""
    print_step "Deploying to Kubernetes..."
    
    # Check kubectl connection
    if ! kubectl cluster-info &> /dev/null; then
        print_error "Cannot connect to Kubernetes cluster. Please check your kubeconfig."
        exit 1
    fi
    
    # Update kustomization.yaml with new tag
    print_step "Updating image tags in kustomization.yaml..."
    cd k8s
    
    # Use sed to update the image tags
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/newTag: \".*\"/newTag: \"$TAG\"/g" kustomization.yaml
    else
        # Linux
        sed -i "s/newTag: \".*\"/newTag: \"$TAG\"/g" kustomization.yaml
    fi
    
    cd ..
    print_success "Image tags updated to $TAG"
    
    # Apply Kubernetes manifests
    print_step "Applying Kubernetes manifests..."
    kubectl apply -k k8s/
    
    # Restart deployments to pick up new images
    print_step "Rolling out new deployments..."
    kubectl rollout restart deployment -n $NAMESPACE
    
    # Wait for rollout to complete
    print_step "Waiting for deployments to be ready..."
    kubectl rollout status deployment/quiz-backend -n $NAMESPACE --timeout=120s
    kubectl rollout status deployment/quiz-game-client -n $NAMESPACE --timeout=120s
    kubectl rollout status deployment/quiz-admin-console -n $NAMESPACE --timeout=120s
    kubectl rollout status deployment/quiz-scoreboard -n $NAMESPACE --timeout=120s
    kubectl rollout status deployment/quiz-db -n $NAMESPACE --timeout=120s
    
    echo ""
    print_success "All deployments rolled out successfully!"
    
    # Show status
    echo ""
    print_step "Deployment Status:"
    kubectl get pods -n $NAMESPACE
    
    echo ""
    print_step "Ingress:"
    kubectl get ingress -n $NAMESPACE
fi

echo ""
echo "=========================================="
echo "  Deployment Complete!"
echo "=========================================="
echo ""
echo "Images:"
echo "  - $REGISTRY/quiz-backend:$TAG"
echo "  - $REGISTRY/quiz-game-client:$TAG"
echo "  - $REGISTRY/quiz-admin-console:$TAG"
echo "  - $REGISTRY/quiz-scoreboard:$TAG"
echo ""
if [ "$DEPLOY" = true ]; then
    echo "URLs (once DNS is configured):"
    echo "  - https://apidays-2025-quiz.events.gravitee.io/game"
    echo "  - https://apidays-2025-quiz.events.gravitee.io/admin"
    echo "  - https://apidays-2025-quiz.events.gravitee.io/scoreboard"
    echo "  - https://apidays-2025-quiz.events.gravitee.io/api"
fi
echo ""
