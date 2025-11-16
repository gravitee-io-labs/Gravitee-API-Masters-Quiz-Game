/**
 * Dynamic Point Mesh Animation for API Masters
 * Adapted from dynamic-point-mesh-animation-with-html5-canvas
 */

class ParticleBackground {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.tid = null;
        this.delay = 200;
        this.w = 0;
        this.h = 0;
        
        // Get current theme colors
        this.updateColors();
        
        // Configuration
        this.opts = {
            particleAmount: 80,
            defaultSpeed: 0.5,
            variantSpeed: 0.5,
            defaultRadius: 2,
            variantRadius: 2,
            linkRadius: 150,
        };
        
        this.init();
    }
    
    updateColors() {
        // Use Gravitee brand colors with theme awareness
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        
        if (isDark) {
            this.particleColor = 'rgba(252, 86, 7, 0.8)'; // Primary orange
            this.lineColorRgb = [252, 86, 7]; // Orange
        } else {
            this.particleColor = 'rgba(252, 86, 7, 0.6)'; // Primary orange
            this.lineColorRgb = [0, 195, 229]; // Cyan
        }
    }
    
    init() {
        this.resizeCanvas();
        this.setupParticles();
        
        // Handle window resize
        window.addEventListener('resize', () => {
            clearTimeout(this.tid);
            this.tid = setTimeout(() => {
                this.resizeCanvas();
            }, this.delay);
        });
        
        // Listen for theme changes
        const observer = new MutationObserver(() => {
            this.updateColors();
        });
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-theme']
        });
        
        // Start animation
        this.animate();
    }
    
    resizeCanvas() {
        this.w = this.canvas.width = window.innerWidth;
        this.h = this.canvas.height = window.innerHeight;
    }
    
    setupParticles() {
        this.particles = [];
        for (let i = 0; i < this.opts.particleAmount; i++) {
            this.particles.push(this.createParticle());
        }
    }
    
    createParticle() {
        const speed = this.opts.defaultSpeed + Math.random() * this.opts.variantSpeed;
        const directionAngle = Math.floor(Math.random() * 360);
        const radius = this.opts.defaultRadius + Math.random() * this.opts.variantRadius;
        
        return {
            x: Math.random() * this.w,
            y: Math.random() * this.h,
            speed: speed,
            directionAngle: directionAngle,
            radius: radius,
            vector: {
                x: Math.cos(directionAngle) * speed,
                y: Math.sin(directionAngle) * speed
            }
        };
    }
    
    updateParticle(particle) {
        // Bounce off walls
        if (particle.x >= this.w || particle.x <= 0) {
            particle.vector.x *= -1;
        }
        if (particle.y >= this.h || particle.y <= 0) {
            particle.vector.y *= -1;
        }
        
        // Keep within bounds
        if (particle.x > this.w) particle.x = this.w;
        if (particle.y > this.h) particle.y = this.h;
        if (particle.x < 0) particle.x = 0;
        if (particle.y < 0) particle.y = 0;
        
        // Move particle
        particle.x += particle.vector.x;
        particle.y += particle.vector.y;
    }
    
    drawParticle(particle) {
        this.ctx.beginPath();
        this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        this.ctx.closePath();
        this.ctx.fillStyle = this.particleColor;
        this.ctx.fill();
    }
    
    checkDistance(x1, y1, x2, y2) {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    }
    
    linkParticles(particle, particles) {
        for (let i = 0; i < particles.length; i++) {
            const distance = this.checkDistance(
                particle.x, particle.y,
                particles[i].x, particles[i].y
            );
            const opacity = 1 - distance / this.opts.linkRadius;
            
            if (opacity > 0) {
                this.ctx.lineWidth = 0.5;
                this.ctx.strokeStyle = `rgba(${this.lineColorRgb[0]}, ${this.lineColorRgb[1]}, ${this.lineColorRgb[2]}, ${opacity})`;
                this.ctx.beginPath();
                this.ctx.moveTo(particle.x, particle.y);
                this.ctx.lineTo(particles[i].x, particles[i].y);
                this.ctx.closePath();
                this.ctx.stroke();
            }
        }
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.w, this.h);
        
        // Update and draw particles
        for (let i = 0; i < this.particles.length; i++) {
            this.updateParticle(this.particles[i]);
            this.drawParticle(this.particles[i]);
        }
        
        // Draw links between particles
        for (let i = 0; i < this.particles.length; i++) {
            this.linkParticles(this.particles[i], this.particles);
        }
    }
    
    destroy() {
        window.removeEventListener('resize', this.resizeHandler);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit to ensure the canvas element exists
    setTimeout(() => {
        window.particleBackground = new ParticleBackground('particleCanvas');
    }, 100);
});
